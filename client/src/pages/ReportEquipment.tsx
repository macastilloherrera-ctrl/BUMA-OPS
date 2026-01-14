import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Wrench, FileText, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Building } from "@shared/schema";

interface EquipmentItem {
  id: string;
  edificio: string;
  nombre: string;
  tipo: string;
  marca: string;
  modelo: string;
  estado: string;
  mantenedor: string;
  ultimaMantencion: string | null;
  proximaMantencion: string | null;
  estadoMantencion: string;
}

interface EquipmentSummary {
  total: number;
  operativos: number;
  enMantencion: number;
  fueraServicio: number;
  mantencionVencida: number;
  mantencionProxima: number;
}

interface EquipmentResponse {
  data: EquipmentItem[];
  summary: EquipmentSummary;
}

export default function ReportEquipment() {
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [maintenanceStatus, setMaintenanceStatus] = useState<string>("all");

  const { data: buildings } = useQuery<Building[]>({ queryKey: ["/api/buildings"] });

  const queryParams = new URLSearchParams();
  if (selectedBuilding !== "all") queryParams.set("buildingId", selectedBuilding);
  if (maintenanceStatus !== "all") queryParams.set("maintenanceStatus", maintenanceStatus);

  const { data: report, isLoading } = useQuery<EquipmentResponse>({
    queryKey: ["/api/reports/equipment", selectedBuilding, maintenanceStatus],
    queryFn: async () => {
      const res = await fetch(`/api/reports/equipment?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Error fetching report");
      return res.json();
    },
  });

  const handleDownload = () => {
    window.location.href = `/api/reports/equipment/excel?${queryParams.toString()}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-CL");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Operativo":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">{status}</Badge>;
      case "En Mantención":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">{status}</Badge>;
      case "Fuera de Servicio":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMaintenanceBadge = (status: string) => {
    switch (status) {
      case "Al día":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />{status}</Badge>;
      case "Próxima":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200"><AlertTriangle className="h-3 w-3 mr-1" />{status}</Badge>;
      case "Vencida":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold">Informe de Equipos Críticos</h1>
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
            <label className="text-xs text-muted-foreground">Estado Mantención</label>
            <Select value={maintenanceStatus} onValueChange={setMaintenanceStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="overdue">Vencidas</SelectItem>
                <SelectItem value="upcoming">Próximas (30 días)</SelectItem>
                <SelectItem value="ok">Al día</SelectItem>
              </SelectContent>
            </Select>
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
                  Este informe muestra el estado de todos los equipos críticos registrados en los edificios.
                  Incluye información de marca, modelo, estado operativo, mantenedor asignado y fechas de mantención.
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
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Equipos</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{report.summary.total}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Operativos</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{report.summary.operativos}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">En Mantención</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-yellow-600">{report.summary.enMantencion}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Fuera Servicio</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{report.summary.fueraServicio}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Mant. Vencida</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{report.summary.mantencionVencida}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Mant. Próxima</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-yellow-600">{report.summary.mantencionProxima}</div></CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Detalle de Equipos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !report?.data.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay equipos para mostrar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Edificio</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Mantenedor</TableHead>
                      <TableHead>Próx. Mantención</TableHead>
                      <TableHead>Estado Mant.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.edificio}</TableCell>
                        <TableCell>{item.nombre}</TableCell>
                        <TableCell>{item.tipo}</TableCell>
                        <TableCell>{item.marca} / {item.modelo}</TableCell>
                        <TableCell>{getStatusBadge(item.estado)}</TableCell>
                        <TableCell>{item.mantenedor}</TableCell>
                        <TableCell>{formatDate(item.proximaMantencion)}</TableCell>
                        <TableCell>{getMaintenanceBadge(item.estadoMantencion)}</TableCell>
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
