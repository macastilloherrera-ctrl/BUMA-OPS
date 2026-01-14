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
import { Download, Wrench, FileText, Info, AlertTriangle, CheckCircle2, DollarSign, Clock, Building2 } from "lucide-react";
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
  costo: number;
}

interface Analytics {
  pendingApproval: {
    total: number;
    items: Array<{
      id: string;
      nombre: string;
      edificio: string;
      tipo: string;
      costo: number;
    }>;
  };
  investmentByBuilding: Array<{
    name: string;
    total: number;
    count: number;
  }>;
  investmentByType: Array<{
    type: string;
    total: number;
    count: number;
  }>;
  totalInvestment: number;
  overdueRisk: {
    total: number;
    critical: number;
  };
}

interface EquipmentSummary {
  total: number;
  operativos: number;
  enMantencion: number;
  fueraServicio: number;
  porAprobar: number;
  mantencionVencida: number;
  mantencionProxima: number;
}

interface EquipmentResponse {
  data: EquipmentItem[];
  summary: EquipmentSummary;
  analytics?: Analytics;
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Operativo":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">{status}</Badge>;
      case "En Mantención":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">{status}</Badge>;
      case "Fuera de Servicio":
        return <Badge variant="destructive">{status}</Badge>;
      case "Por Aprobar":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">{status}</Badge>;
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
            <h1 className="text-xl md:text-2xl font-semibold">Informe Analítico de Equipos Críticos</h1>
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
                  Análisis completo de equipos críticos incluyendo mantenciones vencidas, equipos por aprobar,
                  e inversión en activos por edificio y tipo.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
            <TabsTrigger value="status" data-testid="tab-status">Estado</TabsTrigger>
            <TabsTrigger value="approval" data-testid="tab-approval">Por Aprobar</TabsTrigger>
            <TabsTrigger value="investment" data-testid="tab-investment">Inversión</TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">Detalle</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-6 mt-4">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
              </div>
            ) : report && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Equipos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{report.summary.total}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Operativos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{report.summary.operativos}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">En Mantención</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">{report.summary.enMantencion}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Fuera Servicio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{report.summary.fueraServicio}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Mantenciones Vencidas
                    </CardTitle>
                    <CardDescription>Equipos en riesgo por mantención atrasada</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <div className="text-sm text-muted-foreground">Vencidas</div>
                        <div className="text-4xl font-bold text-red-600">{report.summary.mantencionVencida}</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                        <div className="text-sm text-muted-foreground">Próximas (30 días)</div>
                        <div className="text-4xl font-bold text-yellow-600">{report.summary.mantencionProxima}</div>
                      </div>
                    </div>
                    {report.analytics?.overdueRisk && report.analytics.overdueRisk.critical > 0 && (
                      <div className="mt-4 p-3 bg-red-100 dark:bg-red-950/30 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">{report.analytics.overdueRisk.critical} equipos con más de 30 días vencidos</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="approval" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Equipos Pendientes de Aprobación
                </CardTitle>
                <CardDescription>
                  Gestión de equipos sugeridos por ejecutivos que requieren aprobación
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : report?.analytics?.pendingApproval && report.analytics.pendingApproval.total > 0 ? (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="text-sm text-muted-foreground">Total por Aprobar</div>
                      <div className="text-4xl font-bold text-blue-600">{report.analytics.pendingApproval.total}</div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Equipo</TableHead>
                          <TableHead>Edificio</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Costo Est.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.analytics.pendingApproval.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.nombre}</TableCell>
                            <TableCell>{item.edificio}</TableCell>
                            <TableCell>{item.tipo}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.costo)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                    <p>No hay equipos pendientes de aprobación</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investment" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Inversión por Edificio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : report?.analytics?.investmentByBuilding && report.analytics.investmentByBuilding.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-center p-3 bg-muted/30 rounded-lg mb-4">
                        <div className="text-sm text-muted-foreground">Inversión Total</div>
                        <div className="text-2xl font-bold">{formatCurrency(report.analytics.totalInvestment)}</div>
                      </div>
                      {report.analytics.investmentByBuilding.slice(0, 5).map((item, idx) => {
                        const maxTotal = Math.max(...report.analytics!.investmentByBuilding.map(b => b.total));
                        const percent = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
                        return (
                          <div key={idx} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{item.name}</span>
                              <span className="font-bold">{formatCurrency(item.total)}</span>
                            </div>
                            <Progress value={percent} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">{item.count} equipos</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay datos de inversión</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Inversión por Tipo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : report?.analytics?.investmentByType && report.analytics.investmentByType.length > 0 ? (
                    <div className="space-y-3">
                      {report.analytics.investmentByType.map((item, idx) => (
                        <div key={idx} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{item.type}</span>
                            <span className="font-bold">{formatCurrency(item.total)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.count} equipos</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay datos por tipo</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-4">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
