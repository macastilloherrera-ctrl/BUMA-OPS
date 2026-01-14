import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Users, FileText, Info, TrendingUp, Lightbulb, AlertTriangle, Award, Building2 } from "lucide-react";

interface ExecutiveItem {
  ejecutivoId: string;
  nombre: string;
  email: string;
  edificiosAsignados: number;
  visitasTotales: number;
  visitasRealizadas: number;
  visitasProgramadas: number;
  visitasCanceladas: number;
  ticketsAsignados: number;
  ticketsResueltos: number;
  ticketsPendientes: number;
  hallazgosDetectados: number;
  tasaCumplimiento: number;
}

interface Analytics {
  workload: {
    avgBuildingsPerExec: number;
    avgTicketsPerExec: number;
    overloadedCount: number;
    overloadedExecs: Array<{
      nombre: string;
      edificios: number;
      tickets: number;
    }>;
  };
  findings: {
    totalFindings: number;
    avgFindingsPerExec: number;
    topFinders: Array<{
      nombre: string;
      hallazgos: number;
      visitas: number;
      proactividadRate: number;
    }>;
  };
  performance: {
    topPerformers: Array<{
      nombre: string;
      cumplimiento: number;
    }>;
    lowPerformers: Array<{
      nombre: string;
      cumplimiento: number;
    }>;
  };
}

interface ExecutiveSummary {
  totalEjecutivos: number;
  totalVisitas: number;
  totalVisitasRealizadas: number;
  totalTickets: number;
  totalTicketsResueltos: number;
  promedioCumplimiento: number;
}

interface ExecutiveResponse {
  data: ExecutiveItem[];
  summary: ExecutiveSummary;
  analytics?: Analytics;
}

export default function ReportExecutives() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);

  const { data: report, isLoading } = useQuery<ExecutiveResponse>({
    queryKey: ["/api/reports/executives", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/reports/executives?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Error fetching report");
      return res.json();
    },
  });

  const handleDownload = () => {
    window.location.href = `/api/reports/executives/excel?${queryParams.toString()}`;
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
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold">Informe Analítico de Ejecutivos</h1>
          </div>
          <Button onClick={handleDownload} disabled={!report?.data.length} data-testid="button-download-excel">
            <Download className="h-4 w-4 mr-1" />
            Descargar Excel
          </Button>
        </div>
        
        <div className="mt-4 flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Desde</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 px-3 border rounded-md text-sm" data-testid="input-start-date" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 px-3 border rounded-md text-sm" data-testid="input-end-date" />
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
                  Análisis completo del rendimiento de ejecutivos incluyendo carga de trabajo,
                  hallazgos detectados (proactividad), y ranking de desempeño.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
            <TabsTrigger value="overview" data-testid="tab-overview">Resumen</TabsTrigger>
            <TabsTrigger value="workload" data-testid="tab-workload">Carga</TabsTrigger>
            <TabsTrigger value="findings" data-testid="tab-findings">Hallazgos</TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">Detalle</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[1,2,3,4,5,6].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-16" /></CardContent></Card>)}
              </div>
            ) : report?.summary && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ejecutivos</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{report.summary.totalEjecutivos}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Visitas</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{report.summary.totalVisitas}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Realizadas</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{report.summary.totalVisitasRealizadas}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{report.summary.totalTickets}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Resueltos</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{report.summary.totalTicketsResueltos}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 gap-1">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Cumplimiento</CardTitle>
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{report.summary.promedioCumplimiento}%</div>
                    </CardContent>
                  </Card>
                </div>

                {report.analytics?.performance && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600">
                          <Award className="h-5 w-5" />
                          Top Performers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {report.analytics.performance.topPerformers.length > 0 ? (
                          <div className="space-y-3">
                            {report.analytics.performance.topPerformers.map((exec, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 border rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">{idx + 1}</Badge>
                                  <span className="font-medium">{exec.nombre}</span>
                                </div>
                                <Badge className="bg-green-500/10 text-green-600 border-green-200">{exec.cumplimiento}%</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center py-4 text-muted-foreground">Sin datos</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-600">
                          <AlertTriangle className="h-5 w-5" />
                          Requieren Atención (&lt;70%)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {report.analytics.performance.lowPerformers.length > 0 ? (
                          <div className="space-y-3">
                            {report.analytics.performance.lowPerformers.map((exec, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 border rounded-lg">
                                <span className="font-medium">{exec.nombre}</span>
                                <Badge variant="destructive">{exec.cumplimiento}%</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-green-600">
                            <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Todos los ejecutivos con buen desempeño</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="workload" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Balance de Carga de Trabajo
                </CardTitle>
                <CardDescription>
                  Análisis de distribución de edificios y tickets por ejecutivo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : report?.analytics?.workload && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-sm text-muted-foreground">Prom. Edificios/Ejecutivo</div>
                        <div className="text-3xl font-bold">{report.analytics.workload.avgBuildingsPerExec}</div>
                      </div>
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-sm text-muted-foreground">Prom. Tickets/Ejecutivo</div>
                        <div className="text-3xl font-bold">{report.analytics.workload.avgTicketsPerExec}</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                        <div className="text-sm text-muted-foreground">Sobrecargados</div>
                        <div className="text-3xl font-bold text-yellow-600">{report.analytics.workload.overloadedCount}</div>
                      </div>
                    </div>

                    {report.analytics.workload.overloadedExecs.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          Ejecutivos con Sobrecarga
                        </h4>
                        <div className="space-y-2">
                          {report.analytics.workload.overloadedExecs.map((exec, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                              <span>{exec.nombre}</span>
                              <div className="flex gap-3 text-sm">
                                <span>{exec.edificios} edificios</span>
                                <span>{exec.tickets} tickets</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="findings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Hallazgos Detectados (Proactividad)
                </CardTitle>
                <CardDescription>
                  Tickets creados desde visitas - mide la capacidad proactiva de los ejecutivos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : report?.analytics?.findings && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-sm text-muted-foreground">Total Hallazgos</div>
                        <div className="text-4xl font-bold">{report.analytics.findings.totalFindings}</div>
                      </div>
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-sm text-muted-foreground">Promedio/Ejecutivo</div>
                        <div className="text-4xl font-bold">{report.analytics.findings.avgFindingsPerExec}</div>
                      </div>
                    </div>

                    {report.analytics.findings.topFinders.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Award className="h-4 w-4 text-primary" />
                          Top Ejecutivos Proactivos
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ejecutivo</TableHead>
                              <TableHead className="text-center">Hallazgos</TableHead>
                              <TableHead className="text-center">Visitas</TableHead>
                              <TableHead className="text-center">Tasa Proactividad</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {report.analytics.findings.topFinders.map((exec, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{exec.nombre}</TableCell>
                                <TableCell className="text-center">{exec.hallazgos}</TableCell>
                                <TableCell className="text-center">{exec.visitas}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={exec.proactividadRate >= 50 ? "default" : "secondary"}>
                                    {exec.proactividadRate}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Detalle por Ejecutivo</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : !report?.data.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay ejecutivos para mostrar</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ejecutivo</TableHead>
                          <TableHead className="text-center">Edificios</TableHead>
                          <TableHead className="text-center">Visitas</TableHead>
                          <TableHead className="text-center">Realizadas</TableHead>
                          <TableHead className="text-center">Tickets</TableHead>
                          <TableHead className="text-center">Resueltos</TableHead>
                          <TableHead className="text-center">Hallazgos</TableHead>
                          <TableHead>Cumplimiento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.data.map((item) => (
                          <TableRow key={item.ejecutivoId}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.nombre}</div>
                                <div className="text-xs text-muted-foreground">{item.email}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{item.edificiosAsignados}</TableCell>
                            <TableCell className="text-center">{item.visitasTotales}</TableCell>
                            <TableCell className="text-center text-green-600 font-medium">{item.visitasRealizadas}</TableCell>
                            <TableCell className="text-center">{item.ticketsAsignados}</TableCell>
                            <TableCell className="text-center text-green-600 font-medium">{item.ticketsResueltos}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={item.hallazgosDetectados > 0 ? "default" : "secondary"}>
                                {item.hallazgosDetectados}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-20">
                                  <Progress value={item.tasaCumplimiento} className={`h-2 ${getProgressColor(item.tasaCumplimiento)}`} />
                                </div>
                                <span className="text-sm font-medium w-10">{item.tasaCumplimiento}%</span>
                              </div>
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
