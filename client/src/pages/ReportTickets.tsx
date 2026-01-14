import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Ticket, FileText, Info } from "lucide-react";
import type { Building } from "@shared/schema";

interface TicketItem {
  id: string;
  edificio: string;
  tipo: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  asignado: string;
  fechaCreacion: string;
  fechaCierre: string | null;
  montoFactura: number | null;
}

interface TicketSummary {
  total: number;
  abiertos: number;
  resueltos: number;
  prioridadAlta: number;
  prioridadMedia: number;
  prioridadBaja: number;
}

interface TicketResponse {
  data: TicketItem[];
  summary: TicketSummary;
}

export default function ReportTickets() {
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");

  const { data: buildings } = useQuery<Building[]>({ queryKey: ["/api/buildings"] });

  const queryParams = new URLSearchParams();
  if (selectedBuilding !== "all") queryParams.set("buildingId", selectedBuilding);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);
  if (status !== "all") queryParams.set("status", status);
  if (priority !== "all") queryParams.set("priority", priority);

  const { data: report, isLoading } = useQuery<TicketResponse>({
    queryKey: ["/api/reports/tickets", selectedBuilding, startDate, endDate, status, priority],
    queryFn: async () => {
      const res = await fetch(`/api/reports/tickets?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Error fetching report");
      return res.json();
    },
  });

  const handleDownload = () => {
    window.location.href = `/api/reports/tickets/excel?${queryParams.toString()}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-CL");
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(amount);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Alta":
        return <Badge variant="destructive">{priority}</Badge>;
      case "Media":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">{priority}</Badge>;
      case "Baja":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">{priority}</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Resuelto":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">{status}</Badge>;
      case "Abierto":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">{status}</Badge>;
      case "En Progreso":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold">Informe de Tickets</h1>
          </div>
          <Button onClick={handleDownload} disabled={!report?.data.length} data-testid="button-download-excel">
            <Download className="h-4 w-4 mr-1" />
            Descargar Excel
          </Button>
        </div>
        
        <div className="mt-4 flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Edificio</label>
            <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
              <SelectTrigger className="w-[160px]" data-testid="select-building">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {buildings?.filter(b => b.status === "activo").map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Estado</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="abierto">Abierto</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="resuelto">Resuelto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Prioridad</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="rojo">Alta</SelectItem>
                <SelectItem value="amarillo">Media</SelectItem>
                <SelectItem value="verde">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Desde</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 px-3 border rounded-md text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 px-3 border rounded-md text-sm" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <CardTitle className="text-base">Descripción del Informe</CardTitle>
                <CardDescription className="mt-1">
                  Este informe muestra todos los tickets operativos creados en el sistema.
                  Incluye tickets de urgencia, mantención y planificados con su prioridad, estado actual y costos asociados.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[1,2,3,4,5,6].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-16" /></CardContent></Card>)}
          </div>
        ) : report?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{report.summary.total}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Abiertos</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{report.summary.abiertos}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Resueltos</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{report.summary.resueltos}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Prioridad Alta</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{report.summary.prioridadAlta}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Prioridad Media</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-yellow-600">{report.summary.prioridadMedia}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Prioridad Baja</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{report.summary.prioridadBaja}</div></CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Detalle de Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !report?.data.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay tickets para mostrar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Edificio</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Asignado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.edificio}</TableCell>
                        <TableCell>{item.tipo}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.descripcion}</TableCell>
                        <TableCell>{getPriorityBadge(item.prioridad)}</TableCell>
                        <TableCell>{getStatusBadge(item.estado)}</TableCell>
                        <TableCell>{item.asignado}</TableCell>
                        <TableCell>{formatDate(item.fechaCreacion)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.montoFactura)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
