import { Badge } from "@/components/ui/badge";
import type { VisitStatus, TicketStatus, TicketPriority, IncidentStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: VisitStatus | TicketStatus | IncidentStatus;
  type?: "visit" | "ticket" | "incident";
}

const visitStatusConfig: Record<VisitStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  programada: { label: "Programada", variant: "outline" },
  atrasada: { label: "Atrasada", variant: "destructive" },
  en_curso: { label: "En Curso", variant: "default" },
  realizada: { label: "Realizada", variant: "secondary" },
  cancelada: { label: "Cancelada", variant: "secondary" },
  no_realizada: { label: "No Realizada", variant: "destructive" },
};

const ticketStatusConfig: Record<TicketStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "outline" },
  en_curso: { label: "En Curso", variant: "default" },
  trabajo_completado: { label: "Trabajo Completado", variant: "secondary" },
  vencido: { label: "Vencido", variant: "destructive" },
  resuelto: { label: "Resuelto", variant: "secondary" },
  reprogramado: { label: "Reprogramado", variant: "outline" },
};

const incidentStatusConfig: Record<IncidentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "outline" },
  en_reparacion: { label: "En Reparación", variant: "default" },
  reparada: { label: "Reparada", variant: "secondary" },
  reprogramada: { label: "Reprogramada", variant: "outline" },
};

export function StatusBadge({ status, type = "visit" }: StatusBadgeProps) {
  let config;
  if (type === "visit") {
    config = visitStatusConfig[status as VisitStatus];
  } else if (type === "ticket") {
    config = ticketStatusConfig[status as TicketStatus];
  } else {
    config = incidentStatusConfig[status as IncidentStatus];
  }

  if (!config) return null;

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: TicketPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config: Record<TicketPriority, { label: string; className: string }> = {
    rojo: { label: "Critico", className: "bg-red-500 text-white dark:bg-red-600" },
    amarillo: { label: "Por Vencer", className: "bg-amber-500 text-white dark:bg-amber-600" },
    verde: { label: "Al Dia", className: "bg-green-500 text-white dark:bg-green-600" },
  };

  const { label, className } = config[priority];

  return (
    <Badge className={className}>
      {label}
    </Badge>
  );
}
