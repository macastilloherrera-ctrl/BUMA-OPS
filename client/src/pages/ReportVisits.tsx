import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Download, Calendar, Building2, Users, Clock, TrendingUp, AlertTriangle, CheckCircle, Info, ExternalLink } from "lucide-react";
import type { Building } from "@shared/schema";

interface VisitItem {
  id: string;
  edificio: string;
  ejecutivo: string;
  tipo: string;
  estado: string;
  fechaProgramada: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  notas: string;
  observaciones: string;
  duracionMinutos: number | null;
}

interface VisitSummary {
  total: number;
  realizadas: number;
  programadas: number;
  canceladas: number;
  noRealizadas: number;
  enCurso: number;
}

interface Analytics {
  coverage: {
    totalBuildings: number;
    visitedBuildings: number;
    coveragePercent: number;
  };
  punctuality: {
    totalCompleted: number;
    punctual: number;
    late: number;
    punctualityPercent: number;
  };
  productivity: Array<{
    name: string;
    total: number;
    completed: number;
    cancelled: number;
    completionRate: number;
  }>;
  duration: {
    avgMinutes: number;
    byType: Array<{
      type: string;
      avgMinutes: number;
      count: number;
    }>;
  };
  cancellations: {
    total: number;
    byReason: Array<{ reason: string; count: number }>;
  };
}

interface VisitResponse {
  data: VisitItem[];
  summary: VisitSummary;
  analytics: Analytics;
}

export default function ReportVisits() {
  const [, navigate] = useLocation();
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: buildings } = useQuery<Building[]>({ queryKey: ["/api/buildings"] });

  const queryParams = new URLSearchParams();
  if (selectedBuilding !== "all") queryParams.set("buildingId", selectedBuilding);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);

  const { data: report, isLoading } = useQuery<VisitResponse>({
    queryKey: ["/api/reports/visits", selectedBuilding, startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/reports/visits?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Error fetching report");
      return res.json();
    },
  });

  const handleDownload = () => {
    window.location.href = `/api/reports/visits/excel?${queryParams.toString()}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    const mt = date.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (mt) return `${mt[3]}-${mt[2]}-${mt[1]}`;
    return new Date(date).toLocaleDateString("es-CL");
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Realizada":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">{status}</Badge>;
      case "Programada":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">{status}</Badge>;
      case "En Curso":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">{status}</Badge>;
      case "No Realizada":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200">{status}</Badge>;
      case "Atrasada":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">{status}</Badge>;
      case "Cancelada":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return "bg-green-500";
    if (percent >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold">Informe Analítico de Visitas</h1>
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
              <SelectTrigger className="w-[180px]" data-testid="select-building">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los edificios</SelectItem>
                {buildings?.filter(b => b.status === "activo").map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
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
                  Análisis completo de visitas incluyendo cobertura de edificios, cumplimiento de agenda,
                  productividad por ejecutivo, tiempo en terreno y patrones de cancelación.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
            <TabsTrigger value="metrics" data-testid="tab-metrics">Métricas</TabsTrigger>
            <TabsTrigger value="productivity" data-testid="tab-productivity">Productividad</TabsTrigger>
            <TabsTrigger value="duration" data-testid="tab-duration">Tiempo</TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">Detalle</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-6 mt-4">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
              </div>
            ) : report?.analytics && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        Cobertura de Edificios
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{report.analytics.coverage.coveragePercent}%</div>
                      <Progress 
                        value={report.analytics.coverage.coveragePercent} 
                        className={`h-2 mt-2 ${getProgressColor(report.analytics.coverage.coveragePercent)}`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.analytics.coverage.visitedBuildings} de {report.analytics.coverage.totalBuildings} edificios
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Cumplimiento de Agenda
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{report.analytics.punctuality.punctualityPercent}%</div>
                      <Progress 
                        value={report.analytics.punctuality.punctualityPercent} 
                        className={`h-2 mt-2 ${getProgressColor(report.analytics.punctuality.punctualityPercent)}`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.analytics.punctuality.punctual} puntuales, {report.analytics.punctuality.late} con atraso
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Tiempo Promedio
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{formatDuration(report.analytics.duration.avgMinutes)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Por visita realizada
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Cancelaciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600">{report.analytics.cancellations.total}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.summary.total > 0 
                          ? `${Math.round((report.analytics.cancellations.total / report.summary.total) * 100)}% del total`
                          : "0% del total"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{report.summary.total}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Realizadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{report.summary.realizadas}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Programadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{report.summary.programadas}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">En Curso</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-600">{report.summary.enCurso}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">No Realizadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">{report.summary.noRealizadas}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Canceladas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{report.summary.canceladas}</div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="productivity" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Productividad por Ejecutivo
                </CardTitle>
                <CardDescription>
                  Comparación de carga de trabajo y tasa de cumplimiento por ejecutivo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : !report?.analytics.productivity.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay datos de productividad</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {report.analytics.productivity.map((exec, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{exec.name}</span>
                          <Badge variant={exec.completionRate >= 80 ? "default" : exec.completionRate >= 50 ? "secondary" : "destructive"}>
                            {exec.completionRate}% cumplimiento
                          </Badge>
                        </div>
                        <Progress value={exec.completionRate} className="h-2 mb-2" />
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Total: {exec.total}</span>
                          <span className="text-green-600">Realizadas: {exec.completed}</span>
                          <span className="text-red-600">Canceladas: {exec.cancelled}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="duration" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tiempo en Terreno
                </CardTitle>
                <CardDescription>
                  Duración promedio de visitas por tipo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : !report?.analytics.duration.byType.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay datos de duración</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {report.analytics.duration.byType.map((item, idx) => (
                      <Card key={idx}>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <Badge variant="outline" className="mb-2">{item.type}</Badge>
                            <div className="text-2xl font-bold">{formatDuration(item.avgMinutes)}</div>
                            <p className="text-xs text-muted-foreground mt-1">{item.count} visitas</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {report?.analytics.cancellations.byReason && report.analytics.cancellations.byReason.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Patrones de Cancelación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {report.analytics.cancellations.byReason.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        <span className="capitalize">{item.reason.replace(/_/g, " ")}</span>
                        <Badge variant="destructive">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Detalle de Visitas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : !report?.data.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay visitas para mostrar</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Edificio</TableHead>
                          <TableHead>Ejecutivo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha Programada</TableHead>
                          <TableHead>Duracion</TableHead>
                          <TableHead className="min-w-[250px]">Notas / Observaciones</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.data.map((item) => (
                          <TableRow
                            key={item.id}
                            className="cursor-pointer hover-elevate"
                            onClick={() => navigate(`/visitas/${item.id}`)}
                            data-testid={`row-visit-${item.id}`}
                          >
                            <TableCell className="font-medium">{item.edificio}</TableCell>
                            <TableCell>{item.ejecutivo}</TableCell>
                            <TableCell>{item.tipo}</TableCell>
                            <TableCell>{getStatusBadge(item.estado)}</TableCell>
                            <TableCell>{formatDate(item.fechaProgramada)}</TableCell>
                            <TableCell>{item.duracionMinutos ? formatDuration(item.duracionMinutos) : "-"}</TableCell>
                            <TableCell className="min-w-[250px]">
                              {item.notas && (
                                <p className="text-sm" data-testid={`text-notes-${item.id}`}>{item.notas}</p>
                              )}
                              {item.observaciones && (
                                <p className="text-sm text-muted-foreground mt-1" data-testid={`text-obs-${item.id}`}>
                                  <span className="font-medium">Obs:</span> {item.observaciones}
                                </p>
                              )}
                              {!item.notas && !item.observaciones && "-"}
                            </TableCell>
                            <TableCell>
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
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
