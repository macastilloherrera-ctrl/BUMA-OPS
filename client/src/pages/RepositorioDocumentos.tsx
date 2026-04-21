import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FolderOpen,
  FileText,
  Download,
  Search,
  Building2,
  ShieldAlert,
  Calendar,
  ExternalLink,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileQuestion,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { Building } from "@shared/schema";

interface RepoDocument {
  id: string;
  source: "compliance" | "building_file";
  buildingId: string;
  name: string;
  category: string;
  complianceName: string | null;
  objectKey: string;
  expiryDate: string | null;
  status: "vigente" | "por_vencer" | "vencido" | "sin_fecha" | null;
  createdAt: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  compliance: "Cumplimiento Legal",
  building_file: "Archivo de Edificio",
};

const STATUS_CONFIG = {
  vigente: { label: "Vigente", icon: CheckCircle2, className: "bg-green-100 text-green-700 border-green-200" },
  por_vencer: { label: "Por Vencer", icon: Clock, className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  vencido: { label: "Vencido", icon: AlertTriangle, className: "bg-red-100 text-red-700 border-red-200" },
  sin_fecha: { label: "Sin Fecha", icon: FileQuestion, className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const COMPLIANCE_CATEGORY_LABELS: Record<string, string> = {
  seguros: "Seguros",
  revisiones_tecnicas: "Revisiones Técnicas",
  certificaciones: "Certificaciones",
  permisos_municipales: "Permisos Municipales",
  contratos: "Contratos",
  documentos_legales: "Documentos Legales",
  mantenimiento_obligatorio: "Mantenimiento Obligatorio",
  seguridad: "Seguridad",
  medio_ambiente: "Medio Ambiente",
  laboral: "Laboral",
  financiero: "Financiero",
  sanitario: "Sanitario",
  otro: "Otro",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: RepoDocument["status"] }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${cfg.className}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

export default function RepositorioDocumentos() {
  const [search, setSearch] = useState("");
  const [filterBuilding, setFilterBuilding] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: buildings = [], isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery<RepoDocument[]>({
    queryKey: ["/api/repositorio-documentos", filterBuilding],
    queryFn: async () => {
      const params = filterBuilding !== "all" ? `?buildingId=${filterBuilding}` : "";
      const res = await fetch(`/api/repositorio-documentos${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al obtener repositorio");
      return res.json();
    },
  });

  const buildingMap = Object.fromEntries(buildings.map((b) => [b.id, b.name]));

  const filtered = documents.filter((doc) => {
    const matchSearch =
      !search ||
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      (doc.complianceName || "").toLowerCase().includes(search.toLowerCase()) ||
      (buildingMap[doc.buildingId] || "").toLowerCase().includes(search.toLowerCase());
    const matchSource = filterSource === "all" || doc.source === filterSource;
    const matchStatus = filterStatus === "all" || doc.status === filterStatus;
    return matchSearch && matchSource && matchStatus;
  });

  const statsCompliance = documents.filter((d) => d.source === "compliance").length;
  const statsBuildingFiles = documents.filter((d) => d.source === "building_file").length;
  const statsVencidos = documents.filter((d) => d.status === "vencido").length;
  const statsPorVencer = documents.filter((d) => d.status === "por_vencer").length;

  const isLoading = buildingsLoading || docsLoading;

  function getDocumentUrl(objectKey: string) {
    if (!objectKey) return "#";
    if (objectKey.startsWith("/")) return `/objects${objectKey}`;
    return `/objects/${objectKey}`;
  }

  const categoryLabel = (doc: RepoDocument) => {
    if (doc.source === "compliance") return COMPLIANCE_CATEGORY_LABELS[doc.category] || doc.category;
    return doc.category;
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <FolderOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Repositorio Documental</h1>
            <p className="text-sm text-muted-foreground">
              Todos los documentos de los edificios administrados en un solo lugar
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{documents.length}</p>
                  <p className="text-xs text-muted-foreground">Total documentos</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShieldAlert className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statsCompliance}</p>
                  <p className="text-xs text-muted-foreground">Cumplimiento legal</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{statsVencidos}</p>
                  <p className="text-xs text-muted-foreground">Vencidos</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{statsPorVencer}</p>
                  <p className="text-xs text-muted-foreground">Por vencer</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, edificio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-repo"
              />
            </div>
            <Select value={filterBuilding} onValueChange={setFilterBuilding}>
              <SelectTrigger className="w-[200px]" data-testid="select-building-repo">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todos los edificios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los edificios</SelectItem>
                {buildings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[200px]" data-testid="select-source-repo">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los orígenes</SelectItem>
                <SelectItem value="compliance">Cumplimiento Legal</SelectItem>
                <SelectItem value="building_file">Archivos de Edificio</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-repo">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="vigente">Vigente</SelectItem>
                <SelectItem value="por_vencer">Por Vencer</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="sin_fecha">Sin Fecha</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {filtered.length} documento{filtered.length !== 1 ? "s" : ""}
            {filtered.length < documents.length && (
              <span className="text-muted-foreground font-normal">
                (filtrado de {documents.length} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No se encontraron documentos</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Ajusta los filtros o sube documentos desde Cumplimiento Legal o los expedientes de edificios
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Edificio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => (
                  <TableRow key={`${doc.source}-${doc.id}`} data-testid={`row-doc-${doc.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate max-w-[260px]">{doc.name}</p>
                          {doc.complianceName && doc.complianceName !== doc.name && (
                            <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                              {doc.complianceName}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {buildingMap[doc.buildingId] || doc.buildingId}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{categoryLabel(doc)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          doc.source === "compliance"
                            ? "bg-blue-50 text-blue-700 border-blue-200 text-xs"
                            : "bg-purple-50 text-purple-700 border-purple-200 text-xs"
                        }
                      >
                        {doc.source === "compliance" ? (
                          <ShieldAlert className="h-3 w-3 mr-1" />
                        ) : (
                          <FolderOpen className="h-3 w-3 mr-1" />
                        )}
                        {SOURCE_LABELS[doc.source]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.expiryDate ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(doc.expiryDate)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={getDocumentUrl(doc.objectKey)}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`link-download-${doc.id}`}
                      >
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                          <Download className="h-3.5 w-3.5" />
                          Ver
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
