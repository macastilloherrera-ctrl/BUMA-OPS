import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Download, Ticket, AlertTriangle, Clock, DollarSign, Users, TrendingUp, Info, AlertCircle } from "lucide-react";
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
  fechaVencimiento: string | null;
  fechaCierre: string | null;
  montoFactura: number | null;
  escaladoA: string | null;
  derivaciones: number;
  diasResolucion: number | null;
}

interface TicketSummary {
  total: number;
  abiertos: number;
  enProgreso: number;
  resueltos: number;
  prioridadAlta: number;
  prioridadMedia: number;
  prioridadBaja: number;
}

interface Analytics {
  semaforo: {
    rojo: { total: number; abiertos: number; enProgreso: number; resueltos: number };
    amarillo: { total: number; abiertos: number; enProgreso: number; resueltos: number };
    verde: { total: number; abiertos: number; enProgreso: number; resueltos: number };
  };
  overdue: {
    total: number;
    byPriority: { rojo: number; amarillo: number; verde: number };
  };
  resolution: {
    avgDays: number;
    byType: Array<{ type: string; avgDays: number; count: number }>;
  };
  costByBuilding: Array<{ name: string; total: number; count: number }>;
  totalCost: number;
  escalations: {
    total: number;
    byReason: Array<{ reason: string; count: number }>;
  };
  derivations: {
    ticketsWithDerivations: number;
    totalDerivations: number;
  };
}

interface TicketResponse {
  data: TicketItem[];
  summary: TicketSummary;
  analytics?: Analytics;
}

export default function ReportTickets() {
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  const { data: buildings } = useQuery<Building[]>({ queryKey: ["/api/buildings"] });

  const queryParams = new URLSearchParams();
  if (selectedBuilding !== "all") queryParams.set("buildingId", selectedBuilding);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);
  if (selectedStatus !== "all") queryParams.set("status", selectedStatus);
  if (selectedPriority !== "all") queryParams.set("priority", selectedPriority);

  const { data: report, isLoading } = useQuery<TicketResponse>({
    queryKey: ["/api/reports/tickets", selectedBuilding, startDate, endDate, selectedStatus, selectedPriority],
    queryFn: async () => {
      const res = await fetch(`/api/reports/tickets?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Error fetching report");
      return res.json();
    },
  });

  const handleDownload = () => {
    window.location.href = `/api/reports/tickets/excel?${queryParams.toString()}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Alta":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">{priority}</Badge>;
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
      case "Pendiente":
      case "En Curso":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">{status}</Badge>;
      case "Trabajo Completado":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">{status}</Badge>;
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
            <h1 className="text-xl md:text-2xl font-semibold">Informe Analítico de Tickets</h1>
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
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]" data-testid="select-status">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_curso">En Curso</SelectItem>
                <SelectItem value="trabajo_completado">Completado</SelectItem>
                <SelectItem value="resuelto">Resuelto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Prioridad</label>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-[120px]" data-testid="select-priority">
                <SelectValue placeholder="Todas" />
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
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-3 border rounded-md text-sm"
              data-testid="input-start-date"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-3 border rounded-md text-sm"
              data-testid="input-end-date"
            />
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
                  Análisis completo de tickets incluyendo semáforo de urgencias, tickets vencidos,
                  tiempos de resolución, costos por edificio, escalaciones y derivaciones.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="semaforo" className="w-full">
          <TabsList className="grid w-full grid-cols-5 md:w-auto md:inline-grid">
            <TabsTrigger value="semaforo" data-testid="tab-semaforo">Semáforo</TabsTrigger>
            <TabsTrigger value="resolution" data-testid="tab-resolution">Resolución</TabsTrigger>
            <TabsTrigger value="costs" data-testid="tab-costs">Costos</TabsTrigger>
            <TabsTrigger value="escalations" data-testid="tab-escalations">Escalaciones</TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">Detalle</TabsTrigger>
          </TabsList>

          <TabsContent value="semaforo" className="space-y-6 mt-4">
            {isLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {[1,2,3].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>)}
              </div>
            ) : report?.analytics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Prioridad Alta (Rojo)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{report.analytics.semaforo.rojo.total}</div>
                      <div className="flex gap-4 text-sm mt-2">
                        <span className="text-blue-600">Abiertos: {report.analytics.semaforo.rojo.abiertos}</span>
                        <span className="text-green-600">Resueltos: {report.analytics.semaforo.rojo.resueltos}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Prioridad Media (Amarillo)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{report.analytics.semaforo.amarillo.total}</div>
                      <div className="flex gap-4 text-sm mt-2">
                        <span className="text-blue-600">Abiertos: {report.analytics.semaforo.amarillo.abiertos}</span>
                        <span className="text-green-600">Resueltos: {report.analytics.semaforo.amarillo.resueltos}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Prioridad Baja (Verde)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{report.analytics.semaforo.verde.total}</div>
                      <div className="flex gap-4 text-sm mt-2">
                        <span className="text-blue-600">Abiertos: {report.analytics.semaforo.verde.abiertos}</span>
                        <span className="text-green-600">Resueltos: {report.analytics.semaforo.verde.resueltos}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Tickets Vencidos
                    </CardTitle>
                    <CardDescription>Tickets con fecha de vencimiento pasada que aún no están resueltos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-red-600 mb-4">{report.analytics.overdue.total}</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 border rounded-lg text-center">
                        <div className="text-sm text-muted-foreground">Alta</div>
                        <div className="text-xl font-bold text-red-600">{report.analytics.overdue.byPriority.rojo}</div>
                      </div>
                      <div className="p-3 border rounded-lg text-center">
                        <div className="text-sm text-muted-foreground">Media</div>
                        <div className="text-xl font-bold text-yellow-600">{report.analytics.overdue.byPriority.amarillo}</div>
                      </div>
                      <div className="p-3 border rounded-lg text-center">
                        <div className="text-sm text-muted-foreground">Baja</div>
                        <div className="text-xl font-bold text-green-600">{report.analytics.overdue.byPriority.verde}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{report.summary.total}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Abiertos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{report.summary.abiertos}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">En Progreso</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">{report.summary.enProgreso}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Resueltos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{report.summary.resueltos}</div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="resolution" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tiempos de Resolución
                </CardTitle>
                <CardDescription>
                  Tiempo promedio de resolución por tipo de ticket
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : report?.analytics && (
                  <div className="space-y-6">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">Tiempo Promedio General</div>
                      <div className="text-4xl font-bold">{report.analytics.resolution.avgDays} días</div>
                    </div>
                    
                    {report.analytics.resolution.byType.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-3">
                        {report.analytics.resolution.byType.map((item, idx) => (
                          <Card key={idx}>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <Badge variant="outline" className="mb-2">{item.type}</Badge>
                                <div className="text-2xl font-bold">{item.avgDays} días</div>
                                <p className="text-xs text-muted-foreground mt-1">{item.count} tickets resueltos</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No hay datos de tiempos de resolución
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Costos por Edificio
                </CardTitle>
                <CardDescription>
                  Control presupuestario - Gastos facturados por edificio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : report?.analytics && (
                  <div className="space-y-6">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-sm text-muted-foreground">Costo Total</div>
                      <div className="text-4xl font-bold">{formatCurrency(report.analytics.totalCost)}</div>
                    </div>
                    
                    {report.analytics.costByBuilding.length > 0 ? (
                      <div className="space-y-3">
                        {report.analytics.costByBuilding.map((item, idx) => {
                          const maxCost = Math.max(...report.analytics!.costByBuilding.map(b => b.total));
                          const percent = maxCost > 0 ? (item.total / maxCost) * 100 : 0;
                          return (
                            <div key={idx} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{item.name}</span>
                                <span className="font-bold">{formatCurrency(item.total)}</span>
                              </div>
                              <Progress value={percent} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">{item.count} tickets facturados</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No hay datos de costos</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="escalations" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Escalaciones
                  </CardTitle>
                  <CardDescription>
                    Tickets escalados a gerencia por problemas recurrentes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : report?.analytics && (
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-sm text-muted-foreground">Total Escalaciones</div>
                        <div className="text-4xl font-bold text-orange-600">{report.analytics.escalations.total}</div>
                      </div>
                      
                      {report.analytics.escalations.byReason.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Por Motivo:</div>
                          {report.analytics.escalations.byReason.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 border rounded">
                              <span className="capitalize">{item.reason.replace(/_/g, " ")}</span>
                              <Badge variant="secondary">{item.count}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Derivaciones
                  </CardTitle>
                  <CardDescription>
                    Redistribución de carga de trabajo entre ejecutivos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : report?.analytics && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <div className="text-sm text-muted-foreground">Tickets con Derivaciones</div>
                          <div className="text-3xl font-bold">{report.analytics.derivations.ticketsWithDerivations}</div>
                        </div>
                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <div className="text-sm text-muted-foreground">Total Derivaciones</div>
                          <div className="text-3xl font-bold">{report.analytics.derivations.totalDerivations}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Detalle de Tickets
                </CardTitle>
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
                          <TableHead>Descripción</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Prioridad</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Asignado</TableHead>
                          <TableHead>Días Resolución</TableHead>
                          <TableHead>Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.data.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.edificio}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{item.descripcion}</TableCell>
                            <TableCell>{item.tipo}</TableCell>
                            <TableCell>{getPriorityBadge(item.prioridad)}</TableCell>
                            <TableCell>{getStatusBadge(item.estado)}</TableCell>
                            <TableCell>{item.asignado}</TableCell>
                            <TableCell>{item.diasResolucion !== null ? `${item.diasResolucion} días` : "-"}</TableCell>
                            <TableCell>{item.montoFactura ? formatCurrency(item.montoFactura) : "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
