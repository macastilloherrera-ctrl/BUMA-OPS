import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Download, DollarSign, FileText, Info, TrendingUp, Clock, Building2, AlertTriangle } from "lucide-react";
import type { Building } from "@shared/schema";

interface FinancialItem {
  id: string;
  edificio: string;
  descripcion: string;
  tipo: string;
  proveedor: string;
  numeroFactura: string;
  monto: number;
  fechaEgreso: string;
}

interface BuildingStat {
  edificio: string;
  total: number;
  count: number;
}

interface Analytics {
  pendingInvoices: {
    count: number;
    estimatedAmount: number;
  };
  byType: Array<{
    type: string;
    total: number;
    count: number;
    avgPerTicket: number;
  }>;
  byMonth: Array<{
    month: string;
    total: number;
    count: number;
  }>;
  topBuildings: Array<{
    name: string;
    total: number;
    count: number;
  }>;
}

interface FinancialSummary {
  totalMonto: number;
  totalFacturas: number;
  promedioFactura: number;
  porEdificio: BuildingStat[];
}

interface FinancialResponse {
  data: FinancialItem[];
  summary: FinancialSummary;
  analytics?: Analytics;
}

export default function ReportFinancial() {
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: buildings } = useQuery<Building[]>({ queryKey: ["/api/buildings"] });

  const queryParams = new URLSearchParams();
  if (selectedBuilding !== "all") queryParams.set("buildingId", selectedBuilding);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);

  const { data: report, isLoading } = useQuery<FinancialResponse>({
    queryKey: ["/api/reports/financial", selectedBuilding, startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/reports/financial?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Error fetching report");
      return res.json();
    },
  });

  const handleDownload = () => {
    window.location.href = `/api/reports/financial/excel?${queryParams.toString()}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-CL");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold">Informe Financiero Analítico</h1>
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
                  Análisis financiero completo incluyendo facturación pendiente, gastos por período, 
                  y costos por tipo de ticket y edificio.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
            <TabsTrigger value="overview" data-testid="tab-overview">Resumen</TabsTrigger>
            <TabsTrigger value="byType" data-testid="tab-type">Por Tipo</TabsTrigger>
            <TabsTrigger value="byMonth" data-testid="tab-month">Por Período</TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">Detalle</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
              </div>
            ) : report && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 gap-1">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Egresos</CardTitle>
                      <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(report.summary.totalMonto)}</div>
                      <p className="text-xs text-muted-foreground">{report.summary.totalFacturas} facturas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 gap-1">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Promedio/Factura</CardTitle>
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(report.summary.promedioFactura)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 gap-1">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente Cobro</CardTitle>
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">{report.analytics?.pendingInvoices.count || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(report.analytics?.pendingInvoices.estimatedAmount || 0)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 gap-1">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Edificios</CardTitle>
                      <Building2 className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{report.summary.porEdificio.length}</div>
                      <p className="text-xs text-muted-foreground">con gastos</p>
                    </CardContent>
                  </Card>
                </div>

                {report.analytics?.topBuildings && report.analytics.topBuildings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Top Edificios por Gasto
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {report.analytics.topBuildings.map((item, idx) => {
                          const maxTotal = Math.max(...report.analytics!.topBuildings.map(b => b.total));
                          const percent = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
                          return (
                            <div key={idx} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{item.name}</span>
                                <span className="font-bold">{formatCurrency(item.total)}</span>
                              </div>
                              <Progress value={percent} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">{item.count} facturas</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="byType" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Costo por Tipo de Ticket
                </CardTitle>
                <CardDescription>
                  Desglose de gastos por categoría de ticket para presupuestar por tipo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : report?.analytics?.byType && report.analytics.byType.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {report.analytics.byType.map((item, idx) => (
                      <Card key={idx}>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-sm font-medium text-muted-foreground mb-1">{item.type}</div>
                            <div className="text-2xl font-bold">{formatCurrency(item.total)}</div>
                            <div className="text-xs text-muted-foreground mt-2">
                              {item.count} tickets | Prom: {formatCurrency(item.avgPerTicket)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay datos por tipo</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="byMonth" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Gastos por Período
                </CardTitle>
                <CardDescription>
                  Control mensual y trimestral de egresos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : report?.analytics?.byMonth && report.analytics.byMonth.length > 0 ? (
                  <div className="space-y-3">
                    {report.analytics.byMonth.map((item, idx) => {
                      const maxTotal = Math.max(...report.analytics!.byMonth.map(m => m.total));
                      const percent = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
                      return (
                        <div key={idx} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{formatMonth(item.month)}</span>
                            <span className="font-bold">{formatCurrency(item.total)}</span>
                          </div>
                          <Progress value={percent} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">{item.count} facturas</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay datos por período</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Detalle de Egresos</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : !report?.data.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay egresos para mostrar</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Edificio</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>N° Factura</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead>Fecha Egreso</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.data.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.edificio}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{item.descripcion}</TableCell>
                            <TableCell>{item.tipo}</TableCell>
                            <TableCell>{item.proveedor}</TableCell>
                            <TableCell>{item.numeroFactura}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.monto)}</TableCell>
                            <TableCell>{formatDate(item.fechaEgreso)}</TableCell>
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
