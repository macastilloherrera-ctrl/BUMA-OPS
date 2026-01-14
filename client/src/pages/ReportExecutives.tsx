import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Download, Users, FileText, Info, TrendingUp } from "lucide-react";

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
  tasaCumplimiento: number;
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
            <h1 className="text-xl md:text-2xl font-semibold">Informe de Ejecutivos</h1>
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
                  Este informe muestra el rendimiento de cada ejecutivo de operaciones.
                  Incluye estadísticas de visitas realizadas, tickets gestionados, edificios asignados y tasa de cumplimiento.
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
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ejecutivos</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{report.summary.totalEjecutivos}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Visitas</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{report.summary.totalVisitas}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Visitas Realizadas</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{report.summary.totalVisitasRealizadas}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{report.summary.totalTickets}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tickets Resueltos</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{report.summary.totalTicketsResueltos}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Prom. Cumplimiento</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.promedioCumplimiento}%</div>
              </CardContent>
            </Card>
          </div>
        )}

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
                      <TableHead className="text-center">Visitas Total</TableHead>
                      <TableHead className="text-center">Realizadas</TableHead>
                      <TableHead className="text-center">Pendientes</TableHead>
                      <TableHead className="text-center">Tickets</TableHead>
                      <TableHead className="text-center">Resueltos</TableHead>
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
                        <TableCell className="text-center">{item.visitasProgramadas}</TableCell>
                        <TableCell className="text-center">{item.ticketsAsignados}</TableCell>
                        <TableCell className="text-center text-green-600 font-medium">{item.ticketsResueltos}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20">
                              <Progress value={item.tasaCumplimiento} className="h-2" />
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
      </div>
    </div>
  );
}
