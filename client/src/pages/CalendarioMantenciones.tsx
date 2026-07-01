import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Building2,
  Filter,
  ShieldAlert,
  Wrench,
  CalendarDays,
  List as ListIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Building } from "@shared/schema";

// ─── Tipos ────────────────────────────────────────────────────────────────
type EventStatus = "vencido" | "por_vencer" | "vigente";
type EventType = "compliance" | "equipment";

interface CalendarEvent {
  id: string;
  type: EventType;
  name: string;
  buildingName: string;
  date: string; // ISO desde el JSON
  status: EventStatus;
  category: string;
}

type TypeFilter = "all" | "compliance" | "equipment";

// ─── Constantes de presentación ─────────────────────────────────────────────
const STATUS_STYLES: Record<
  EventStatus,
  { dot: string; chip: string; label: string; emoji: string }
> = {
  vencido: {
    dot: "bg-red-500",
    chip: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    label: "Vencido",
    emoji: "🔴",
  },
  por_vencer: {
    dot: "bg-yellow-500",
    chip: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
    label: "Por Vencer",
    emoji: "🟡",
  },
  vigente: {
    dot: "bg-green-500",
    chip: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
    label: "Vigente",
    emoji: "🟢",
  },
};

const TYPE_LABELS: Record<EventType, string> = {
  compliance: "Cumplimiento Legal",
  equipment: "Mantención de Equipo",
};

// Etiquetas legibles para categorías de Cumplimiento Legal. Para equipos, la
// categoría es el tipo de equipo (texto libre), que se muestra tal cual.
const COMPLIANCE_CATEGORY_LABELS: Record<string, string> = {
  certificacion_gas: "Certificación Gas",
  certificacion_ascensores: "Certificación Ascensores",
  certificacion_electrica: "Certificación Eléctrica",
  certificacion_hvac: "Certificación HVAC / Clima",
  revision_extintores: "Revisión Extintores",
  poliza_incendio: "Póliza de Incendio",
  poliza_responsabilidad_civil: "Póliza RC",
  plan_emergencia: "Plan de Emergencia",
  contrato_administracion: "Contrato Administración",
  contrato_mantencion: "Contrato Mantención",
  permiso_edificacion: "Permiso de Edificación",
  inspeccion_tecnica: "Inspección Técnica",
  certificado_copropiedad: "Certificado de Copropiedad",
  reglamento_inscrito_cbr: "Reglamento Inscrito CBR",
  sello_verde: "Sello Verde",
  lavado_estanques: "Lavado de Estanques",
  red_humeda: "Red Húmeda",
  limpieza_vertical: "Limpieza Vertical",
  poliza_seguro: "Póliza de Seguro",
  acta_asamblea: "Acta de Asamblea",
  certificado_vivienda_social: "Certificado Vivienda Social",
  otro: "Otro",
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function categoryLabel(ev: CalendarEvent): string {
  if (ev.type === "compliance") {
    return COMPLIANCE_CATEGORY_LABELS[ev.category] || ev.category;
  }
  return ev.category || "—";
}

// Día de calendario (America/Santiago) en formato yyyy-MM-dd, para agrupar los
// eventos por celda sin corrimientos de zona horaria.
function chileDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

// ─── Componente ──────────────────────────────────────────────────────────────
export default function CalendarioMantenciones() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [filterBuilding, setFilterBuilding] = useState<string>("all");
  const [filterType, setFilterType] = useState<TypeFilter>("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const month = currentDate.getMonth() + 1; // API usa 1-12
  const year = currentDate.getFullYear();

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const calendarUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filterBuilding !== "all") params.set("buildingId", filterBuilding);
    params.set("month", String(month));
    params.set("year", String(year));
    params.set("type", filterType);
    return `/api/maintenance-calendar?${params.toString()}`;
  }, [filterBuilding, filterType, month, year]);

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: [calendarUrl],
  });

  // Grilla mensual con semanas completas (lunes a domingo).
  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentDate]);

  // Eventos agrupados por día de calendario chileno.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = chileDayKey(ev.date);
      const list = map.get(key);
      if (list) list.push(ev);
      else map.set(key, [ev]);
    }
    return map;
  }, [events]);

  // Contadores de semáforo (sobre los eventos del mes/filtros actuales).
  const counters = useMemo(
    () => ({
      vencido: events.filter((e) => e.status === "vencido").length,
      por_vencer: events.filter((e) => e.status === "por_vencer").length,
      vigente: events.filter((e) => e.status === "vigente").length,
    }),
    [events],
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            Calendario de Mantenciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vencimientos de Cumplimiento Legal y próximas mantenciones de equipos críticos, con semáforo por estado
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {(["vencido", "por_vencer", "vigente"] as EventStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5" data-testid={`legend-${s}`}>
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_STYLES[s].dot}`} />
              {STATUS_STYLES[s].label} ({counters[s]})
            </span>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          {/* Selector de edificio */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={filterBuilding} onValueChange={setFilterBuilding}>
              <SelectTrigger className="w-[220px]" data-testid="select-building">
                <SelectValue placeholder="Edificio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los edificios</SelectItem>
                {buildings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de evento */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={(v) => setFilterType(v as TypeFilter)}>
              <SelectTrigger className="w-[220px]" data-testid="select-type">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="compliance">Cumplimiento Legal</SelectItem>
                <SelectItem value="equipment">Mantenciones de Equipos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Navegación mes/año */}
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate((d) => subMonths(d, 1))}
              data-testid="button-prev-month"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="w-40 text-center font-medium capitalize" data-testid="text-current-month">
              {format(currentDate, "MMMM yyyy", { locale: es })}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate((d) => addMonths(d, 1))}
              data-testid="button-next-month"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              data-testid="button-today"
            >
              Hoy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vistas */}
      <Tabs defaultValue="calendario">
        <TabsList>
          <TabsTrigger value="calendario" className="gap-2" data-testid="tab-calendario">
            <CalendarDays className="h-4 w-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="lista" className="gap-2" data-testid="tab-lista">
            <ListIcon className="h-4 w-4" />
            Lista
          </TabsTrigger>
        </TabsList>

        {/* ── Vista Calendario ── */}
        <TabsContent value="calendario">
          <Card>
            <CardContent className="p-2 sm:p-4">
              {/* Encabezado de días */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>
              {/* Grilla */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayEvents = eventsByDay.get(key) || [];
                  const inMonth = isSameMonth(day, currentDate);
                  return (
                    <div
                      key={key}
                      className={`min-h-[92px] rounded-md border p-1 flex flex-col gap-1 ${
                        inMonth ? "bg-card" : "bg-muted/40 text-muted-foreground"
                      }`}
                      data-testid={`day-${key}`}
                    >
                      <span className="text-xs font-medium px-1">{format(day, "d")}</span>
                      <div className="flex flex-col gap-1 overflow-hidden">
                        {dayEvents.map((ev) => {
                          const st = STATUS_STYLES[ev.status];
                          return (
                            <button
                              key={`${ev.type}-${ev.id}`}
                              type="button"
                              onClick={() => setSelectedEvent(ev)}
                              title={`${ev.name} · ${ev.buildingName}`}
                              className={`text-left text-[11px] leading-tight truncate rounded border px-1 py-0.5 hover:opacity-80 transition-opacity ${st.chip}`}
                              data-testid={`event-chip-${ev.id}`}
                            >
                              {ev.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {isLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">Cargando eventos…</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Vista Lista ── */}
        <TabsContent value="lista">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Edificio</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No hay eventos para el mes y los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  )}
                  {events.map((ev) => {
                    const st = STATUS_STYLES[ev.status];
                    return (
                      <TableRow
                        key={`${ev.type}-${ev.id}`}
                        className="cursor-pointer"
                        onClick={() => setSelectedEvent(ev)}
                        data-testid={`list-row-${ev.id}`}
                      >
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(ev.date), "dd MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>{ev.buildingName}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            {ev.type === "compliance" ? (
                              <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {TYPE_LABELS[ev.type]}
                          </span>
                        </TableCell>
                        <TableCell>{ev.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={st.chip}>
                            {st.emoji} {st.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detalle de evento */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedEvent.type === "compliance" ? (
                    <ShieldAlert className="h-5 w-5 text-primary" />
                  ) : (
                    <Wrench className="h-5 w-5 text-primary" />
                  )}
                  {selectedEvent.name}
                </DialogTitle>
              </DialogHeader>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Edificio</dt>
                  <dd className="font-medium text-right">{selectedEvent.buildingName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Tipo</dt>
                  <dd className="font-medium text-right">{TYPE_LABELS[selectedEvent.type]}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Categoría</dt>
                  <dd className="font-medium text-right">{categoryLabel(selectedEvent)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Fecha</dt>
                  <dd className="font-medium text-right">
                    {format(new Date(selectedEvent.date), "dd 'de' MMMM yyyy", { locale: es })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 items-center">
                  <dt className="text-muted-foreground">Estado</dt>
                  <dd>
                    <Badge variant="outline" className={STATUS_STYLES[selectedEvent.status].chip}>
                      {STATUS_STYLES[selectedEvent.status].emoji} {STATUS_STYLES[selectedEvent.status].label}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
