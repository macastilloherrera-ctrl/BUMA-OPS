import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, Building2, FileText, Info } from "lucide-react";
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
}

interface VisitSummary {
  total: number;
  realizadas: number;
  programadas: number;
  canceladas: number;
}

interface VisitResponse {
  data: VisitItem[];
  summary: VisitSummary;
}

export default function ReportVisits() {
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
    return new Date(date).toLocaleDateString("es-CL");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Realizada":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">{status}</Badge>;
      case "Programada":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">{status}</Badge>;
      case "Cancelada":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold">Informe de Visitas</h1>
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
                  Este informe muestra todas las visitas realizadas por los ejecutivos a los edificios administrados.
                  Incluye visitas de rutina, urgentes y de seguimiento con su estado actual, fechas y observaciones.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-16" /></CardContent></Card>)}
          </div>
        ) : report?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Visitas</CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Canceladas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{report.summary.canceladas}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
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
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.edificio}</TableCell>
                        <TableCell>{item.ejecutivo}</TableCell>
                        <TableCell>{item.tipo}</TableCell>
                        <TableCell>{getStatusBadge(item.estado)}</TableCell>
                        <TableCell>{formatDate(item.fechaProgramada)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.notas || "-"}</TableCell>
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
