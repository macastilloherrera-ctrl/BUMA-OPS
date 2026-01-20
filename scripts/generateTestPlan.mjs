import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, BorderStyle, AlignmentType } from "docx";
import fs from "fs";

const tests = [
  {
    module: "1. AUTENTICACIÓN",
    cases: [
      {
        id: "AUTH-001",
        name: "Login con credenciales válidas",
        profile: "Todos",
        precondition: "Usuario activo con email @buma.cl registrado",
        steps: [
          "Navegar a la página de login",
          "Ingresar email válido",
          "Ingresar contraseña correcta",
          "Hacer clic en Ingresar"
        ],
        expected: "Usuario es autenticado, escucha saludo de voz 'Bienvenido [nombre] a BUMA OPS' y es redirigido según su rol"
      },
      {
        id: "AUTH-002",
        name: "Login con credenciales inválidas",
        profile: "Todos",
        precondition: "Ninguna",
        steps: [
          "Navegar a la página de login",
          "Ingresar email válido",
          "Ingresar contraseña incorrecta",
          "Hacer clic en Ingresar"
        ],
        expected: "Se muestra mensaje de error 'Credenciales inválidas'"
      },
      {
        id: "AUTH-003",
        name: "Login usuario inactivo",
        profile: "Todos",
        precondition: "Usuario marcado como inactivo",
        steps: [
          "Navegar a la página de login",
          "Ingresar credenciales de usuario inactivo",
          "Hacer clic en Ingresar"
        ],
        expected: "Se muestra mensaje 'Tu cuenta está desactivada. Contacta al administrador.'"
      },
      {
        id: "AUTH-004",
        name: "Cambio de contraseña obligatorio (primer login)",
        profile: "Todos",
        precondition: "Usuario nuevo con mustChangePassword = true",
        steps: [
          "Login con contraseña temporal",
          "Sistema redirige a pantalla de cambio de contraseña",
          "Ingresar nueva contraseña (mín. 6 caracteres)",
          "Confirmar nueva contraseña",
          "Hacer clic en Cambiar Contraseña"
        ],
        expected: "Contraseña actualizada, usuario redirigido a su vista principal según rol"
      },
      {
        id: "AUTH-005",
        name: "Logout",
        profile: "Todos",
        precondition: "Usuario autenticado",
        steps: [
          "Hacer clic en icono de perfil",
          "Seleccionar 'Cerrar Sesión'"
        ],
        expected: "Sesión cerrada, usuario redirigido a página de login"
      },
      {
        id: "AUTH-006",
        name: "Validación de email @buma.cl",
        profile: "Super Admin",
        precondition: "Estar en formulario de creación de usuario",
        steps: [
          "Ingresar email sin dominio @buma.cl",
          "Intentar crear usuario"
        ],
        expected: "Solo emails @buma.cl o @buma.local son aceptados para usuarios BUMA"
      }
    ]
  },
  {
    module: "2. GESTIÓN DE USUARIOS",
    cases: [
      {
        id: "USR-001",
        name: "Crear nuevo usuario",
        profile: "Super Admin",
        precondition: "Acceso al panel de Super Admin",
        steps: [
          "Ir a pestaña Usuarios",
          "Clic en 'Nuevo Usuario'",
          "Completar: Nombre, Apellido, Email, Rol, Teléfono",
          "Ingresar contraseña temporal (mín. 6 caracteres)",
          "Clic en 'Crear Usuario'"
        ],
        expected: "Usuario creado exitosamente, aparece en lista con estado Activo"
      },
      {
        id: "USR-002",
        name: "Editar usuario existente",
        profile: "Super Admin / Gerente General",
        precondition: "Usuario existente en el sistema",
        steps: [
          "Localizar usuario en lista",
          "Clic en botón Editar",
          "Modificar campos deseados",
          "Guardar cambios"
        ],
        expected: "Datos actualizados correctamente, cambios reflejados en lista"
      },
      {
        id: "USR-003",
        name: "Desactivar usuario",
        profile: "Super Admin / Gerente General",
        precondition: "Usuario activo existente",
        steps: [
          "Localizar usuario en lista",
          "Cambiar estado a Inactivo",
          "Confirmar acción"
        ],
        expected: "Usuario desactivado, no puede iniciar sesión"
      },
      {
        id: "USR-004",
        name: "Resetear contraseña de usuario",
        profile: "Super Admin",
        precondition: "Usuario existente",
        steps: [
          "Localizar usuario en lista",
          "Clic en 'Resetear Contraseña'",
          "Ingresar nueva contraseña temporal",
          "Confirmar"
        ],
        expected: "Contraseña reseteada, usuario debe cambiarla en próximo login"
      },
      {
        id: "USR-005",
        name: "Asignar edificios a ejecutivo",
        profile: "Super Admin / Gerente General",
        precondition: "Ejecutivo de operaciones existente",
        steps: [
          "Ir a administración de usuarios",
          "Seleccionar ejecutivo",
          "Clic en 'Asignar Edificios'",
          "Seleccionar edificios",
          "Guardar"
        ],
        expected: "Edificios asignados, ejecutivo solo ve sus edificios asignados"
      },
      {
        id: "USR-006",
        name: "Cambiar rol de usuario",
        profile: "Super Admin",
        precondition: "Usuario existente",
        steps: [
          "Editar usuario",
          "Cambiar rol en selector",
          "Guardar cambios"
        ],
        expected: "Rol actualizado, permisos del usuario cambian según nuevo rol"
      }
    ]
  },
  {
    module: "3. GESTIÓN DE EDIFICIOS",
    cases: [
      {
        id: "BLD-001",
        name: "Crear nuevo edificio",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Acceso a módulo de edificios",
        steps: [
          "Ir a Edificios",
          "Clic en 'Nuevo Edificio'",
          "Completar: Nombre, Dirección, Región, Comuna",
          "Agregar datos adicionales (depto, ascensores, etc.)",
          "Guardar"
        ],
        expected: "Edificio creado, aparece en lista de edificios"
      },
      {
        id: "BLD-002",
        name: "Editar información de edificio",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Edificio existente",
        steps: [
          "Seleccionar edificio",
          "Clic en Editar",
          "Modificar campos",
          "Guardar cambios"
        ],
        expected: "Información actualizada correctamente"
      },
      {
        id: "BLD-003",
        name: "Agregar personal de edificio",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Edificio existente",
        steps: [
          "Ir a detalle de edificio",
          "Sección Personal",
          "Clic en 'Agregar Personal'",
          "Completar datos del empleado",
          "Guardar"
        ],
        expected: "Personal agregado al edificio"
      },
      {
        id: "BLD-004",
        name: "Subir reglamento de copropiedad",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Edificio existente",
        steps: [
          "Ir a detalle de edificio",
          "Sección Documentos",
          "Clic en 'Subir Reglamento'",
          "Seleccionar archivo PDF",
          "Confirmar"
        ],
        expected: "Documento subido y asociado al edificio"
      },
      {
        id: "BLD-005",
        name: "Agregar característica personalizada",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Edificio existente",
        steps: [
          "Ir a detalle de edificio",
          "Sección Características",
          "Clic en 'Agregar'",
          "Ingresar nombre y valor",
          "Guardar"
        ],
        expected: "Característica agregada al edificio"
      }
    ]
  },
  {
    module: "4. GESTIÓN DE VISITAS",
    cases: [
      {
        id: "VST-001",
        name: "Programar nueva visita",
        profile: "Ejecutivo Operaciones",
        precondition: "Edificio asignado al ejecutivo",
        steps: [
          "Ir a Visitas",
          "Clic en 'Nueva Visita'",
          "Seleccionar edificio",
          "Seleccionar fecha y hora",
          "Seleccionar tipo (Rutina/Urgente)",
          "Guardar"
        ],
        expected: "Visita programada, aparece en calendario con estado 'Programada'"
      },
      {
        id: "VST-002",
        name: "Iniciar visita",
        profile: "Ejecutivo Operaciones",
        precondition: "Visita programada para hoy",
        steps: [
          "Ir a Visitas del día",
          "Seleccionar visita",
          "Clic en 'Iniciar Visita'"
        ],
        expected: "Estado cambia a 'En Curso', se registra hora de inicio"
      },
      {
        id: "VST-003",
        name: "Completar checklist de visita",
        profile: "Ejecutivo Operaciones",
        precondition: "Visita en curso",
        steps: [
          "En pantalla de visita en curso",
          "Marcar items del checklist",
          "Agregar observaciones si corresponde"
        ],
        expected: "Items marcados guardados, progreso visible"
      },
      {
        id: "VST-004",
        name: "Registrar hallazgo/incidente",
        profile: "Ejecutivo Operaciones",
        precondition: "Visita en curso",
        steps: [
          "En pantalla de visita",
          "Clic en 'Registrar Hallazgo'",
          "Describir incidente",
          "Tomar fotos si aplica",
          "Guardar"
        ],
        expected: "Hallazgo registrado, opción de crear ticket asociado"
      },
      {
        id: "VST-005",
        name: "Completar visita",
        profile: "Ejecutivo Operaciones",
        precondition: "Visita en curso con checklist completado",
        steps: [
          "Clic en 'Finalizar Visita'",
          "Agregar observaciones finales",
          "Confirmar"
        ],
        expected: "Visita marcada como 'Realizada', hora de fin registrada"
      },
      {
        id: "VST-006",
        name: "Cancelar/Reagendar visita",
        profile: "Ejecutivo Operaciones / Gerente Operaciones",
        precondition: "Visita programada",
        steps: [
          "Seleccionar visita",
          "Clic en 'Cancelar/Reagendar'",
          "Seleccionar motivo",
          "Si reagenda: seleccionar nueva fecha",
          "Confirmar"
        ],
        expected: "Visita cancelada o reagendada según opción elegida"
      },
      {
        id: "VST-007",
        name: "Ver historial de visitas por edificio",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Edificio con visitas registradas",
        steps: [
          "Ir a Dashboard de Visitas",
          "Filtrar por edificio",
          "Ver lista de visitas"
        ],
        expected: "Lista de visitas del edificio con fechas, estados y ejecutivos"
      }
    ]
  },
  {
    module: "5. GESTIÓN DE TICKETS",
    cases: [
      {
        id: "TKT-001",
        name: "Crear ticket desde hallazgo",
        profile: "Ejecutivo Operaciones",
        precondition: "Hallazgo registrado en visita",
        steps: [
          "En hallazgo, clic 'Crear Ticket'",
          "Completar tipo (Urgencia/Planificado/Mantención)",
          "Asignar prioridad (Rojo/Amarillo/Verde)",
          "Describir problema",
          "Guardar"
        ],
        expected: "Ticket creado con estado 'Pendiente', asociado al edificio"
      },
      {
        id: "TKT-002",
        name: "Crear ticket directo",
        profile: "Ejecutivo / Gerente Operaciones",
        precondition: "Acceso a módulo de tickets",
        steps: [
          "Ir a Tickets",
          "Clic en 'Nuevo Ticket'",
          "Seleccionar edificio",
          "Completar información",
          "Asignar responsable inicial",
          "Guardar"
        ],
        expected: "Ticket creado, notificación enviada al responsable"
      },
      {
        id: "TKT-003",
        name: "Ver dashboard semáforo",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Tickets existentes en sistema",
        steps: [
          "Ir a Dashboard de Tickets"
        ],
        expected: "Vista con tickets agrupados por prioridad: Rojo (urgente), Amarillo (medio), Verde (bajo)"
      },
      {
        id: "TKT-004",
        name: "Derivar ticket a otro ejecutivo",
        profile: "Ejecutivo Operaciones / Gerente Operaciones",
        precondition: "Ticket asignado",
        steps: [
          "Abrir detalle del ticket",
          "Clic en 'Derivar'",
          "Seleccionar nuevo responsable",
          "Agregar motivo de derivación",
          "Confirmar"
        ],
        expected: "Ticket reasignado, historial muestra derivación, notificación enviada"
      },
      {
        id: "TKT-005",
        name: "Agregar cotización a ticket",
        profile: "Ejecutivo Operaciones",
        precondition: "Ticket en estado Pendiente o En Curso",
        steps: [
          "Abrir detalle del ticket",
          "Sección Cotizaciones",
          "Clic en 'Agregar Cotización'",
          "Subir documento y monto",
          "Guardar"
        ],
        expected: "Cotización agregada, visible para gerentes para aprobación"
      },
      {
        id: "TKT-006",
        name: "Aprobar cotización",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Ticket con cotización pendiente",
        steps: [
          "Abrir ticket con cotización",
          "Revisar cotización",
          "Clic en 'Aprobar' o 'Rechazar'"
        ],
        expected: "Estado de cotización actualizado, trabajo puede continuar"
      },
      {
        id: "TKT-007",
        name: "Marcar trabajo completado",
        profile: "Ejecutivo Operaciones",
        precondition: "Ticket en curso con trabajo realizado",
        steps: [
          "Abrir ticket",
          "Clic en 'Trabajo Completado'",
          "Indicar estado de factura:",
          "  - Sin factura (requiere explicación)",
          "  - Factura pendiente",
          "  - Con factura (subir datos)",
          "Confirmar"
        ],
        expected: "Ticket cambia a estado 'Trabajo Completado', listo para cierre"
      },
      {
        id: "TKT-008",
        name: "Cerrar ticket con factura",
        profile: "Gerente Operaciones",
        precondition: "Ticket con trabajo completado y factura",
        steps: [
          "Abrir ticket",
          "Verificar factura",
          "Clic en 'Cerrar Ticket'",
          "Confirmar"
        ],
        expected: "Ticket cerrado como 'Resuelto', costo registrado"
      },
      {
        id: "TKT-009",
        name: "Escalar ticket",
        profile: "Ejecutivo Operaciones",
        precondition: "Ticket que requiere atención gerencial",
        steps: [
          "Abrir ticket",
          "Clic en 'Escalar'",
          "Seleccionar gerente destino",
          "Agregar motivo de escalación",
          "Confirmar"
        ],
        expected: "Ticket escalado, gerente notificado, visible en su dashboard"
      },
      {
        id: "TKT-010",
        name: "Ver historial completo del ticket",
        profile: "Todos (según permisos)",
        precondition: "Ticket con actividad",
        steps: [
          "Abrir detalle del ticket",
          "Ir a pestaña 'Historial'"
        ],
        expected: "Timeline con todas las acciones: creación, derivaciones, actualizaciones, fotos, cotizaciones"
      }
    ]
  },
  {
    module: "6. EQUIPOS CRÍTICOS",
    cases: [
      {
        id: "EQP-001",
        name: "Sugerir equipo crítico",
        profile: "Ejecutivo Operaciones",
        precondition: "Visita en curso o acceso a edificio",
        steps: [
          "Ir a Equipos Críticos del edificio",
          "Clic en 'Sugerir Equipo'",
          "Completar: Nombre, Tipo, Ubicación",
          "Agregar foto si disponible",
          "Enviar"
        ],
        expected: "Sugerencia enviada con estado 'Pendiente', notificación a gerente"
      },
      {
        id: "EQP-002",
        name: "Aprobar equipo crítico",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Sugerencia de equipo pendiente",
        steps: [
          "Ir a Equipos Críticos",
          "Filtrar por 'Pendientes'",
          "Revisar sugerencia",
          "Clic en 'Aprobar' o 'Rechazar'"
        ],
        expected: "Equipo aprobado aparece en lista activa, o rechazado con motivo"
      },
      {
        id: "EQP-003",
        name: "Registrar mantención de equipo",
        profile: "Ejecutivo Operaciones",
        precondition: "Equipo crítico aprobado",
        steps: [
          "Seleccionar equipo",
          "Clic en 'Registrar Mantención'",
          "Ingresar fecha, proveedor, observaciones",
          "Guardar"
        ],
        expected: "Mantención registrada, próxima fecha calculada según frecuencia"
      },
      {
        id: "EQP-004",
        name: "Ver equipos con mantención vencida",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Equipos con mantenciones programadas",
        steps: [
          "Ir a Dashboard de Equipos",
          "Ver indicador de vencidos"
        ],
        expected: "Lista de equipos con mantención vencida resaltados"
      }
    ]
  },
  {
    module: "7. NOTIFICACIONES",
    cases: [
      {
        id: "NOT-001",
        name: "Recibir notificación de ticket asignado",
        profile: "Ejecutivo Operaciones",
        precondition: "Ticket asignado al usuario",
        steps: [
          "Sistema genera notificación automática",
          "Usuario ve indicador en campana"
        ],
        expected: "Notificación visible con detalle del ticket asignado"
      },
      {
        id: "NOT-002",
        name: "Marcar notificación como leída",
        profile: "Todos",
        precondition: "Notificación no leída",
        steps: [
          "Clic en campana de notificaciones",
          "Clic en notificación"
        ],
        expected: "Notificación marcada como leída, contador actualizado"
      },
      {
        id: "NOT-003",
        name: "Ver todas las notificaciones",
        profile: "Todos",
        precondition: "Usuario con notificaciones",
        steps: [
          "Clic en campana",
          "Clic en 'Ver todas'"
        ],
        expected: "Lista completa de notificaciones con filtros"
      }
    ]
  },
  {
    module: "8. REPORTES",
    cases: [
      {
        id: "RPT-001",
        name: "Generar reporte de cumplimiento normativo",
        profile: "Todos los perfiles",
        precondition: "Edificios con datos",
        steps: [
          "Ir a Reportes > Cumplimiento Normativo",
          "Seleccionar edificio (opcional)"
        ],
        expected: "Informe con scoring 0-100% basado en: Reglamento cargado (25%), Equipos sin vencimientos (25%), Mín. 4 visitas/30 días (25%), Sin tickets urgentes pendientes (25%)"
      },
      {
        id: "RPT-002",
        name: "Generar informe de egresos",
        profile: "Gerente General / Gerente Comercial",
        precondition: "Tickets cerrados con facturas",
        steps: [
          "Ir a Reportes > Egresos",
          "Seleccionar rango de fechas",
          "Filtrar por edificio (opcional)",
          "Exportar formato Edipro"
        ],
        expected: "Reporte con detalle de gastos por edificio, proveedor, categoría"
      },
      {
        id: "RPT-003",
        name: "Ver reporte de visitas",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Visitas registradas",
        steps: [
          "Ir a Reportes > Visitas",
          "Seleccionar período"
        ],
        expected: "Métricas de cobertura, puntualidad, productividad por ejecutivo"
      },
      {
        id: "RPT-004",
        name: "Ver reporte de tickets",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Tickets en sistema",
        steps: [
          "Ir a Reportes > Tickets"
        ],
        expected: "Vista semáforo, tiempos de resolución, costos, escalaciones"
      },
      {
        id: "RPT-005",
        name: "Ver reporte de ejecutivos",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Ejecutivos con actividad",
        steps: [
          "Ir a Reportes > Ejecutivos"
        ],
        expected: "Análisis de rendimiento, carga de trabajo, hallazgos por ejecutivo"
      }
    ]
  },
  {
    module: "9. SUPER ADMIN",
    cases: [
      {
        id: "SPA-001",
        name: "Configurar branding del sistema",
        profile: "Super Admin",
        precondition: "Acceso a panel Super Admin",
        steps: [
          "Ir a Super Admin > Configuración",
          "Modificar nombre de empresa",
          "Subir logo",
          "Cambiar color primario",
          "Guardar"
        ],
        expected: "Branding actualizado en toda la aplicación"
      },
      {
        id: "SPA-002",
        name: "Ver logs del sistema",
        profile: "Super Admin",
        precondition: "Actividad en sistema",
        steps: [
          "Ir a Super Admin > Logs"
        ],
        expected: "Registro de acciones de usuarios con fechas y detalles"
      }
    ]
  },
  {
    module: "10. PERMISOS POR ROL",
    cases: [
      {
        id: "ROL-001",
        name: "Ejecutivo no ve costos",
        profile: "Ejecutivo Operaciones",
        precondition: "Ticket con costo asignado",
        steps: [
          "Abrir detalle de ticket"
        ],
        expected: "Campo de costo NO visible para el ejecutivo"
      },
      {
        id: "ROL-002",
        name: "Gerente ve costos",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Ticket con costo asignado",
        steps: [
          "Abrir detalle de ticket"
        ],
        expected: "Campo de costo visible con monto"
      },
      {
        id: "ROL-003",
        name: "Ejecutivo solo ve edificios asignados",
        profile: "Ejecutivo Operaciones",
        precondition: "Ejecutivo con edificios asignados",
        steps: [
          "Ir a lista de edificios"
        ],
        expected: "Solo se muestran edificios asignados al ejecutivo"
      },
      {
        id: "ROL-004",
        name: "Gerente ve todos los edificios",
        profile: "Gerente General / Gerente Operaciones",
        precondition: "Edificios en sistema",
        steps: [
          "Ir a lista de edificios"
        ],
        expected: "Todos los edificios del sistema visibles"
      },
      {
        id: "ROL-005",
        name: "Gerente Finanzas solo lectura",
        profile: "Gerente Finanzas",
        precondition: "Acceso al sistema",
        steps: [
          "Navegar por dashboards y reportes"
        ],
        expected: "Puede ver información pero no tiene botones de edición"
      }
    ]
  }
];

function createTable(cases) {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: "1E3A5F" },
          children: [new Paragraph({ children: [new TextRun({ text: "ID", bold: true, color: "FFFFFF" })] })]
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "1E3A5F" },
          children: [new Paragraph({ children: [new TextRun({ text: "Caso de Prueba", bold: true, color: "FFFFFF" })] })]
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: "1E3A5F" },
          children: [new Paragraph({ children: [new TextRun({ text: "Perfil", bold: true, color: "FFFFFF" })] })]
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: "1E3A5F" },
          children: [new Paragraph({ children: [new TextRun({ text: "Precondición", bold: true, color: "FFFFFF" })] })]
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: "1E3A5F" },
          children: [new Paragraph({ children: [new TextRun({ text: "Pasos", bold: true, color: "FFFFFF" })] })]
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: "1E3A5F" },
          children: [new Paragraph({ children: [new TextRun({ text: "Resultado Esperado", bold: true, color: "FFFFFF" })] })]
        })
      ]
    })
  ];

  cases.forEach((c, idx) => {
    const bgColor = idx % 2 === 0 ? "F5F5F5" : "FFFFFF";
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: bgColor },
            children: [new Paragraph({ children: [new TextRun({ text: c.id, size: 20 })] })]
          }),
          new TableCell({
            shading: { fill: bgColor },
            children: [new Paragraph({ children: [new TextRun({ text: c.name, bold: true, size: 20 })] })]
          }),
          new TableCell({
            shading: { fill: bgColor },
            children: [new Paragraph({ children: [new TextRun({ text: c.profile, size: 20 })] })]
          }),
          new TableCell({
            shading: { fill: bgColor },
            children: [new Paragraph({ children: [new TextRun({ text: c.precondition, size: 20 })] })]
          }),
          new TableCell({
            shading: { fill: bgColor },
            children: c.steps.map((s, i) => new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${s}`, size: 20 })] }))
          }),
          new TableCell({
            shading: { fill: bgColor },
            children: [new Paragraph({ children: [new TextRun({ text: c.expected, size: 20 })] })]
          })
        ]
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows
  });
}

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "BUMA OPS",
              bold: true,
              size: 56,
              color: "1E3A5F"
            })
          ]
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "Plan de Pruebas Funcionales",
              bold: true,
              size: 40,
              color: "1E3A5F"
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: `Versión 1.0 - ${new Date().toLocaleDateString("es-CL")}`,
              size: 24,
              color: "666666"
            })
          ]
        }),
        new Paragraph({
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: "INFORMACIÓN DEL DOCUMENTO",
              bold: true,
              size: 28,
              color: "1E3A5F"
            })
          ]
        }),
        new Paragraph({
          children: [new TextRun({ text: "Proyecto: BUMA OPS - Plataforma de Operaciones", size: 24 })]
        }),
        new Paragraph({
          children: [new TextRun({ text: "Módulo: Módulo 1 - Core Operations", size: 24 })]
        }),
        new Paragraph({
          children: [new TextRun({ text: "Ambiente de Pruebas: ops.buma.cl", size: 24 })]
        }),
        new Paragraph({
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: "PERFILES DE USUARIO",
              bold: true,
              size: 28,
              color: "1E3A5F"
            })
          ]
        }),
        new Paragraph({ children: [new TextRun({ text: "• Super Admin: Configuración del sistema, branding, gestión avanzada", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "• Gerente General: Acceso total, ve costos, aprueba equipos, administra usuarios", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "• Gerente Operaciones: Gestiona visitas/tickets, ve costos, aprueba equipos", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "• Gerente Finanzas: Solo lectura en dashboards y reportes", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "• Ejecutivo Operaciones: Trabajo de campo, no ve costos", size: 24 })] }),
        
        ...tests.flatMap(section => [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 300 },
            children: [
              new TextRun({
                text: section.module,
                bold: true,
                size: 32,
                color: "1E3A5F"
              })
            ]
          }),
          createTable(section.cases)
        ]),
        
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 600, after: 300 },
          pageBreakBefore: true,
          children: [
            new TextRun({
              text: "RESUMEN DE CASOS DE PRUEBA",
              bold: true,
              size: 32,
              color: "1E3A5F"
            })
          ]
        }),
        new Paragraph({
          children: [new TextRun({ text: `Total de módulos: ${tests.length}`, size: 24 })]
        }),
        new Paragraph({
          children: [new TextRun({ text: `Total de casos de prueba: ${tests.reduce((acc, t) => acc + t.cases.length, 0)}`, size: 24 })]
        }),
        new Paragraph({
          spacing: { before: 400 },
          children: [new TextRun({ text: "Desglose por módulo:", bold: true, size: 24 })]
        }),
        ...tests.map(t => new Paragraph({
          children: [new TextRun({ text: `  • ${t.module}: ${t.cases.length} casos`, size: 24 })]
        }))
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("docs/BUMA_OPS_Plan_de_Pruebas.docx", buffer);
  console.log("Documento generado: docs/BUMA_OPS_Plan_de_Pruebas.docx");
});
