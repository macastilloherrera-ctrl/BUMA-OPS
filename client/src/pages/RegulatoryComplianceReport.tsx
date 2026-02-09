import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  FileCheck, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Wrench,
  Calendar,
  Ticket,
  FileText
} from "lucide-react";
import type { Building } from "@shared/schema";

interface ComplianceItem {
  buildingId: string;
  buildingName: string;
  buildingAddress: string;
  hasRegulationDocument: boolean;
  regulationDocumentUrl: string | null;
  totalEquipment: number;
  equipmentWithMaintenance: number;
  equipmentOverdue: number;
  recentVisitsCount: number;
  openTickets: number;
  urgentTickets: number;
  compliancePercent: number;
  complianceStatus: "cumple" | "parcial" | "no_cumple";
}

interface ComplianceSummary {
  totalBuildings: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  withRegulation: number;
  withOverdueEquipment: number;
  averageCompliance: number;
}

interface ComplianceResponse {
  buildings: ComplianceItem[];
  summary: ComplianceSummary;
}

export default function RegulatoryComplianceReport() {
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");

  const { data: buildings, isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const queryParams = new URLSearchParams();
  if (selectedBuilding !== "all") queryParams.set("buildingId", selectedBuilding);

  const { data: compliance, isLoading: complianceLoading } = useQuery<ComplianceResponse>({
    queryKey: ["/api/reports/regulatory-compliance", selectedBuilding],
    queryFn: async () => {
      const res = await fetch(`/api/reports/regulatory-compliance?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Error fetching compliance data");
      return res.json();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "cumple":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Cumple</Badge>;
      case "parcial":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200"><AlertTriangle className="h-3 w-3 mr-1" />Parcial</Badge>;
      case "no_cumple":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200"><XCircle className="h-3 w-3 mr-1" />No Cumple</Badge>;
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
            <FileCheck className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold">Estado Documental y Operativo</h1>
          </div>
        </div>
        
        <div className="mt-4 flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
              <SelectTrigger className="w-[200px]" data-testid="select-building">
                <SelectValue placeholder="Seleccionar edificio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los edificios</SelectItem>
                {buildingsLoading ? (
                  <SelectItem value="loading" disabled>Cargando...</SelectItem>
                ) : (
                  buildings?.filter(b => b.status === "activo").map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {complianceLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : compliance?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Promedio Cumplimiento
                </CardTitle>
                <FileCheck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{compliance.summary.averageCompliance}%</div>
                <Progress 
                  value={compliance.summary.averageCompliance} 
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Edificios Cumplen
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{compliance.summary.compliant}</div>
                <p className="text-xs text-muted-foreground">de {compliance.summary.totalBuildings} edificios</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cumplimiento Parcial
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{compliance.summary.partial}</div>
                <p className="text-xs text-muted-foreground">requieren atención</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  No Cumplen
                </CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{compliance.summary.nonCompliant}</div>
                <p className="text-xs text-muted-foreground">acción urgente</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Detalle por Edificio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {complianceLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !compliance?.buildings.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay datos de cumplimiento disponibles</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Edificio</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span className="hidden md:inline">Reglamento</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Wrench className="h-4 w-4" />
                          <span className="hidden md:inline">Equipos</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span className="hidden md:inline">Visitas (30d)</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Ticket className="h-4 w-4" />
                          <span className="hidden md:inline">Tickets</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Cumplimiento</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compliance.buildings.map((item) => (
                      <TableRow key={item.buildingId} data-testid={`row-building-${item.buildingId}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.buildingName}</div>
                            <div className="text-xs text-muted-foreground hidden md:block">
                              {item.buildingAddress}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.hasRegulationDocument ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.totalEquipment === 0 ? (
                            <span className="text-muted-foreground text-sm">-</span>
                          ) : item.equipmentOverdue > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {item.equipmentOverdue} vencidos
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                              {item.totalEquipment} OK
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={item.recentVisitsCount >= 2 ? "text-green-600 font-medium" : item.recentVisitsCount === 1 ? "text-yellow-600" : "text-red-600"}>
                            {item.recentVisitsCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.urgentTickets > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {item.urgentTickets} urgentes
                            </Badge>
                          ) : item.openTickets > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              {item.openTickets} abiertos
                            </Badge>
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-16 md:w-24">
                              <Progress 
                                value={item.compliancePercent} 
                                className="h-2"
                              />
                            </div>
                            <span className="text-sm font-medium w-10 text-right">
                              {item.compliancePercent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(item.complianceStatus)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {compliance?.summary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criterios de Evaluación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <span className="font-medium">Reglamento de Copropiedad:</span>
                    <span className="text-muted-foreground ml-1">Documento cargado en el sistema (25%)</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Wrench className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <span className="font-medium">Mantención de Equipos:</span>
                    <span className="text-muted-foreground ml-1">Equipos críticos sin mantenciones vencidas (25%)</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <span className="font-medium">Visitas Recientes:</span>
                    <span className="text-muted-foreground ml-1">Mínimo 2 visitas en últimos 30 días (25%)</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Ticket className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <span className="font-medium">Tickets Urgentes:</span>
                    <span className="text-muted-foreground ml-1">Sin tickets urgentes pendientes (25%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
