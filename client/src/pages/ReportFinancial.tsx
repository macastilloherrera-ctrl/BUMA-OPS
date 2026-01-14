import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, DollarSign, FileText, Info, TrendingUp } from "lucide-react";
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

interface FinancialSummary {
  totalMonto: number;
  totalFacturas: number;
  promedioFactura: number;
  porEdificio: BuildingStat[];
}

interface FinancialResponse {
  data: FinancialItem[];
  summary: FinancialSummary;
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

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold">Informe Financiero</h1>
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
                  Este informe muestra los egresos financieros asociados a tickets resueltos que generaron factura.
                  Incluye información del proveedor, número de factura, monto y fecha de egreso por edificio.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-24" /></CardContent></Card>)}
          </div>
        ) : report?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Egresos</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(report.summary.totalMonto)}</div>
                <p className="text-xs text-muted-foreground">{report.summary.totalFacturas} facturas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Promedio por Factura</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(report.summary.promedioFactura)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Por Edificio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-24 overflow-auto">
                  {report.summary.porEdificio.map((b, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="truncate">{b.edificio}</span>
                      <span className="font-medium">{formatCurrency(b.total)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
      </div>
    </div>
  );
}
