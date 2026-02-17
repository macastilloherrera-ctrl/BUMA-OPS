import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Settings, Users, Key, Shield, Building2, Save, RefreshCw, UserPlus, Pencil, ToggleLeft, Upload, FileText, Image, Download, Book, Code, Activity, Wrench, Trash2, RotateCcw, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { UserRole } from "@shared/schema";

interface SystemConfig {
  id: string;
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  updatedAt: string;
  updatedBy: string | null;
}

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  profile: {
    id: string;
    role: UserRole;
    buildingScope: string;
    phone: string | null;
    isActive: boolean;
  } | null;
  assignedBuildings: { id: string; name: string }[];
}

interface Role {
  value: UserRole;
  label: string;
  description: string;
}

interface Building {
  id: string;
  name: string;
}

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  gerente_general: "Gerente General",
  gerente_operaciones: "Gerente Operaciones",
  gerente_comercial: "Gerente Comercial",
  gerente_finanzas: "Gerente Finanzas",
  ejecutivo_operaciones: "Ejecutivo Operaciones",
};

export default function SuperAdminPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("config");
  
  const [configForm, setConfigForm] = useState({
    companyName: "",
    logoUrl: "",
    primaryColor: "#2563eb",
  });

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userForm, setUserForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "ejecutivo_operaciones" as UserRole,
    phone: "",
    password: "",
    isActive: true,
  });

  const [logoUploading, setLogoUploading] = useState(false);

  const [logFilters, setLogFilters] = useState({ action: "", buildingId: "", limit: 50, offset: 0 });
  const [diagBuildingId, setDiagBuildingId] = useState("");
  const [bulkForm, setBulkForm] = useState({ buildingId: "", periodMonth: new Date().getMonth() + 1, periodYear: new Date().getFullYear() });
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showClearExportConfirm, setShowClearExportConfirm] = useState(false);

  const { data: config, isLoading: configLoading } = useQuery<SystemConfig>({
    queryKey: ["/api/super-admin/config"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/super-admin/users"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
  });

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const auditLogsQueryKey = ["/api/super-admin/audit-logs", logFilters.action, logFilters.buildingId, logFilters.limit, logFilters.offset];
  const { data: auditData, isLoading: logsLoading, refetch: refetchLogs } = useQuery<{ logs: any[]; total: number }>({
    queryKey: auditLogsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (logFilters.action) params.set("action", logFilters.action);
      if (logFilters.buildingId) params.set("buildingId", logFilters.buildingId);
      params.set("limit", String(logFilters.limit));
      params.set("offset", String(logFilters.offset));
      const res = await fetch(`/api/super-admin/audit-logs?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar logs");
      return res.json();
    },
    enabled: activeTab === "logs",
  });

  const { data: diagnostics = [], isLoading: diagLoading, refetch: refetchDiag } = useQuery<any[]>({
    queryKey: ["/api/super-admin/diagnostics", diagBuildingId],
    queryFn: async () => {
      const params = diagBuildingId ? `?buildingId=${diagBuildingId}` : "";
      const res = await fetch(`/api/super-admin/diagnostics${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar diagnostico");
      return res.json();
    },
    enabled: activeTab === "diagnostics",
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/super-admin/bulk-delete-transactions", bulkForm),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setShowBulkDeleteConfirm(false);
      refetchDiag();
      refetchLogs();
      toast({ title: `${data.deleted} transacciones eliminadas` });
    },
    onError: (error: any) => {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    },
  });

  const clearExportMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/super-admin/clear-export-flags", bulkForm),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setShowClearExportConfirm(false);
      toast({ title: `Flags limpiados en ${data.cleared} transacciones` });
    },
    onError: (error: any) => {
      toast({ title: "Error al limpiar flags", description: error.message, variant: "destructive" });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: typeof configForm) => apiRequest("PATCH", "/api/super-admin/config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/config"] });
      toast({ title: "Configuración actualizada" });
    },
    onError: (error: any) => {
      toast({ title: "Error al actualizar", description: error.message, variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: typeof userForm) => apiRequest("POST", "/api/super-admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      setShowCreateDialog(false);
      resetUserForm();
      toast({ title: "Usuario creado exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al crear usuario", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof userForm }) =>
      apiRequest("PATCH", `/api/super-admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      setShowEditDialog(false);
      setSelectedUser(null);
      resetUserForm();
      toast({ title: "Usuario actualizado" });
    },
    onError: (error: any) => {
      toast({ title: "Error al actualizar", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/super-admin/users/${id}/toggle-active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast({ title: "Estado del usuario actualizado" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/super-admin/users/${id}/reset-password`),
    onSuccess: () => {
      setShowResetPasswordDialog(false);
      setSelectedUser(null);
      toast({ title: "Contrasena reseteada. El usuario recibira un email con instrucciones." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetUserForm = () => {
    setUserForm({
      email: "",
      firstName: "",
      lastName: "",
      role: "ejecutivo_operaciones",
      phone: "",
      password: "",
      isActive: true,
    });
  };

  const handleLogoUpload = async (file: { name: string; size: number; type: string }) => {
    const res = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type,
      }),
    });
    const { uploadURL, objectPath } = await res.json();
    return {
      method: "PUT" as const,
      url: uploadURL,
      headers: { "Content-Type": file.type },
      objectPath,
    };
  };

  const openEditDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setUserForm({
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: user.profile?.role || "ejecutivo_operaciones",
      phone: user.profile?.phone || "",
      password: "",
      isActive: user.profile?.isActive ?? true,
    });
    setShowEditDialog(true);
  };

  const handleSaveConfig = () => {
    updateConfigMutation.mutate(configForm);
  };

  // Initialize config form when data loads
  if (config && configForm.companyName === "" && !configLoading) {
    setConfigForm({
      companyName: config.companyName || "BUMA OPS",
      logoUrl: config.logoUrl || "",
      primaryColor: config.primaryColor || "#2563eb",
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">
              Panel Super Admin
            </h1>
            <p className="text-sm text-muted-foreground">
              Configuración del sistema y gestión avanzada
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="config" className="gap-2" data-testid="tab-config">
                <Settings className="h-4 w-4" />
                Configuración
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
                <Users className="h-4 w-4" />
                Usuarios
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2" data-testid="tab-logs">
                <FileText className="h-4 w-4" />
                Logs
              </TabsTrigger>
              <TabsTrigger value="diagnostics" className="gap-2" data-testid="tab-diagnostics">
                <Activity className="h-4 w-4" />
                Diagnostico
              </TabsTrigger>
              <TabsTrigger value="corrections" className="gap-2" data-testid="tab-corrections">
                <Wrench className="h-4 w-4" />
                Correcciones
              </TabsTrigger>
              <TabsTrigger value="docs" className="gap-2" data-testid="tab-docs">
                <Book className="h-4 w-4" />
                Documentacion
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Identidad de la Empresa
                  </CardTitle>
                  <CardDescription>
                    Configura el nombre y logo que se mostraran en toda la plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nombre de la Empresa</Label>
                      <Input
                        id="companyName"
                        value={configForm.companyName}
                        onChange={(e) => setConfigForm({ ...configForm, companyName: e.target.value })}
                        placeholder="Nombre de la empresa"
                        data-testid="input-company-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo de la Empresa</Label>
                      <div className="flex items-center gap-4">
                        {configForm.logoUrl && (
                          <div className="w-16 h-16 rounded border flex items-center justify-center bg-muted overflow-hidden">
                            <img 
                              src={configForm.logoUrl} 
                              alt="Logo" 
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        )}
                        {!configForm.logoUrl && (
                          <div className="w-16 h-16 rounded border flex items-center justify-center bg-muted">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={5242880}
                          onGetUploadParameters={async (file) => {
                            setLogoUploading(true);
                            const res = await fetch("/api/uploads/request-url", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                name: file.name,
                                size: file.size,
                                contentType: file.type,
                              }),
                            });
                            const data = await res.json();
                            (file as any).objectPath = data.objectPath;
                            return {
                              method: "PUT",
                              url: data.uploadURL,
                              headers: { "Content-Type": file.type },
                            };
                          }}
                          onComplete={async (result) => {
                            setLogoUploading(false);
                            if (result.successful && result.successful.length > 0) {
                              const uploadedFile = result.successful[0];
                              const objectPath = (uploadedFile.data as any)?.objectPath || (uploadedFile as any).objectPath;
                              if (objectPath) {
                                setConfigForm({ ...configForm, logoUrl: objectPath });
                                toast({ title: "Logo subido correctamente" });
                              } else {
                                toast({ title: "Error al obtener ruta del logo", variant: "destructive" });
                              }
                            }
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {logoUploading ? "Subiendo..." : "Subir Logo"}
                        </ObjectUploader>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Color Primario</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={configForm.primaryColor}
                        onChange={(e) => setConfigForm({ ...configForm, primaryColor: e.target.value })}
                        className="w-16 h-10 p-1"
                        data-testid="input-primary-color"
                      />
                      <Input
                        value={configForm.primaryColor}
                        onChange={(e) => setConfigForm({ ...configForm, primaryColor: e.target.value })}
                        placeholder="#2563eb"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveConfig} 
                      disabled={updateConfigMutation.isPending}
                      data-testid="button-save-config"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateConfigMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Informacion del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Version</p>
                      <p className="text-lg font-semibold">1.0.0</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Usuarios Activos</p>
                      <p className="text-lg font-semibold">{users.filter(u => u.profile?.isActive).length}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Edificios</p>
                      <p className="text-lg font-semibold">{buildings.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Gestión de Usuarios</h2>
                <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-user">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Cargando usuarios...
                          </TableCell>
                        </TableRow>
                      ) : users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            No hay usuarios registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                            <TableCell>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.profile?.role === "super_admin" ? "default" : "secondary"}>
                                {user.profile ? roleLabels[user.profile.role] : "Sin perfil"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.profile?.isActive ? "default" : "outline"}>
                                {user.profile?.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditDialog(user)}
                                  data-testid={`button-edit-${user.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => toggleActiveMutation.mutate(user.id)}
                                  data-testid={`button-toggle-${user.id}`}
                                >
                                  <ToggleLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowResetPasswordDialog(true);
                                  }}
                                  data-testid={`button-reset-password-${user.id}`}
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Logs de Auditoria
                  </CardTitle>
                  <CardDescription>
                    Registro de actividades del sistema ({auditData?.total ?? 0} registros)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Accion</Label>
                      <Select value={logFilters.action} onValueChange={(v) => setLogFilters({ ...logFilters, action: v === "all" ? "" : v, offset: 0 })}>
                        <SelectTrigger className="w-[180px]" data-testid="select-log-action">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="login">Login</SelectItem>
                          <SelectItem value="import_bank_transactions">Importacion</SelectItem>
                          <SelectItem value="export_bank_transactions">Exportacion Txns</SelectItem>
                          <SelectItem value="export_incomes">Exportacion Ingresos</SelectItem>
                          <SelectItem value="create_user">Crear Usuario</SelectItem>
                          <SelectItem value="create_expense">Crear Egreso</SelectItem>
                          <SelectItem value="create_income">Crear Ingreso</SelectItem>
                          <SelectItem value="bulk_delete_transactions">Borrado Masivo</SelectItem>
                          <SelectItem value="clear_export_flags">Limpiar Flags</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Edificio</Label>
                      <Select value={logFilters.buildingId} onValueChange={(v) => setLogFilters({ ...logFilters, buildingId: v === "all" ? "" : v, offset: 0 })}>
                        <SelectTrigger className="w-[200px]" data-testid="select-log-building">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {buildings.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetchLogs()} data-testid="button-refresh-logs">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Actualizar
                    </Button>
                  </div>

                  {logsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Cargando logs...</div>
                  ) : !auditData?.logs?.length ? (
                    <div className="text-center py-8 text-muted-foreground">No hay registros de auditoria</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Accion</TableHead>
                          <TableHead>Edificio</TableHead>
                          <TableHead>Detalle</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditData.logs.map((log: any) => (
                          <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {log.createdAt ? new Date(log.createdAt).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}
                            </TableCell>
                            <TableCell className="text-sm">{log.userName || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{log.action}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{log.buildingName || "-"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {log.metadata ? (() => { try { const m = JSON.parse(log.metadata); return Object.entries(m).map(([k, v]) => `${k}: ${v}`).join(", "); } catch { return log.metadata; } })() : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {auditData && auditData.total > logFilters.limit && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {logFilters.offset + 1}-{Math.min(logFilters.offset + logFilters.limit, auditData.total)} de {auditData.total}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={logFilters.offset === 0} onClick={() => setLogFilters({ ...logFilters, offset: Math.max(0, logFilters.offset - logFilters.limit) })}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={logFilters.offset + logFilters.limit >= auditData.total} onClick={() => setLogFilters({ ...logFilters, offset: logFilters.offset + logFilters.limit })}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="diagnostics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Diagnostico por Edificio
                  </CardTitle>
                  <CardDescription>
                    Resumen de datos por edificio: transacciones bancarias, ingresos y egresos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Filtrar Edificio</Label>
                      <Select value={diagBuildingId} onValueChange={(v) => setDiagBuildingId(v === "all" ? "" : v)}>
                        <SelectTrigger className="w-[220px]" data-testid="select-diag-building">
                          <SelectValue placeholder="Todos los edificios" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los edificios</SelectItem>
                          {buildings.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetchDiag()} data-testid="button-refresh-diag">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Actualizar
                    </Button>
                  </div>

                  {diagLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Cargando diagnostico...</div>
                  ) : !diagnostics.length ? (
                    <div className="text-center py-8 text-muted-foreground">Sin datos de diagnostico</div>
                  ) : (
                    <div className="grid gap-4">
                      {diagnostics.map((d: any) => (
                        <Card key={d.buildingId}>
                          <CardContent className="pt-4">
                            <h3 className="font-semibold mb-3">{d.buildingName}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground">Txns Bancarias</p>
                                <p className="text-lg font-semibold">{d.bankTransactions?.total ?? 0}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-green-500/10">
                                <p className="text-xs text-muted-foreground">Identificadas</p>
                                <p className="text-lg font-semibold text-green-600">{d.bankTransactions?.identified ?? 0}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-yellow-500/10">
                                <p className="text-xs text-muted-foreground">Sugeridas</p>
                                <p className="text-lg font-semibold text-yellow-600">{d.bankTransactions?.suggested ?? 0}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground">Ingresos</p>
                                <p className="text-lg font-semibold">{d.incomes ?? 0}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground">Egresos</p>
                                <p className="text-lg font-semibold">{d.expenses ?? 0}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="corrections" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Correcciones Masivas
                  </CardTitle>
                  <CardDescription>
                    Herramientas para corregir datos en lote. Estas operaciones quedan registradas en los logs de auditoria.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Edificio</Label>
                      <Select value={bulkForm.buildingId} onValueChange={(v) => setBulkForm({ ...bulkForm, buildingId: v })}>
                        <SelectTrigger data-testid="select-bulk-building">
                          <SelectValue placeholder="Seleccionar edificio" />
                        </SelectTrigger>
                        <SelectContent>
                          {buildings.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Mes</Label>
                      <Select value={String(bulkForm.periodMonth)} onValueChange={(v) => setBulkForm({ ...bulkForm, periodMonth: parseInt(v) })}>
                        <SelectTrigger data-testid="select-bulk-month">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                            <SelectItem key={m} value={String(m)}>{new Date(2000, m - 1).toLocaleString("es-CL", { month: "long" })}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ano</Label>
                      <Select value={String(bulkForm.periodYear)} onValueChange={(v) => setBulkForm({ ...bulkForm, periodYear: parseInt(v) })}>
                        <SelectTrigger data-testid="select-bulk-year">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026].map((y) => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <h4 className="font-medium">Eliminar Transacciones Bancarias</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Elimina todas las transacciones bancarias del edificio y periodo seleccionado. Util para reimportar datos corruptos.
                        </p>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!bulkForm.buildingId}
                          onClick={() => setShowBulkDeleteConfirm(true)}
                          data-testid="button-bulk-delete"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar Transacciones
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4 text-orange-500" />
                          <h4 className="font-medium">Limpiar Flags de Exportacion</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Resetea los flags de exportacion para que las transacciones puedan ser re-exportadas como nuevas.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!bulkForm.buildingId}
                          onClick={() => setShowClearExportConfirm(true)}
                          data-testid="button-clear-export"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Limpiar Flags
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="docs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Book className="h-5 w-5" />
                    Documentacion del Sistema
                  </CardTitle>
                  <CardDescription>
                    Descarga los manuales y guias de BUMA OPS en formato Word
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="hover-elevate cursor-pointer" onClick={() => window.open("/api/docs/download/Manual_Usuario_BUMA_OPS.docx", "_blank")}>
                      <CardContent className="pt-6 text-center">
                        <Book className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">Manual de Usuario</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Guía completa para usuarios del sistema con instrucciones por rol
                        </p>
                        <Button variant="outline" size="sm" className="gap-2" data-testid="button-download-manual">
                          <Download className="h-4 w-4" />
                          Descargar
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="hover-elevate cursor-pointer" onClick={() => window.open("/api/docs/download/Guia_Administracion_BUMA_OPS.docx", "_blank")}>
                      <CardContent className="pt-6 text-center">
                        <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">Guía de Administración</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Manual para administradores del sistema y gestión de usuarios
                        </p>
                        <Button variant="outline" size="sm" className="gap-2" data-testid="button-download-admin">
                          <Download className="h-4 w-4" />
                          Descargar
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="hover-elevate cursor-pointer" onClick={() => window.open("/api/docs/download/Documentacion_Tecnica_BUMA_OPS.docx", "_blank")}>
                      <CardContent className="pt-6 text-center">
                        <Code className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">Documentación Técnica</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Arquitectura, APIs y modelo de datos para desarrolladores
                        </p>
                        <Button variant="outline" size="sm" className="gap-2" data-testid="button-download-tech">
                          <Download className="h-4 w-4" />
                          Descargar
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="hover-elevate cursor-pointer" onClick={() => window.open("/api/docs/download/Reglas_de_Negocio_BUMA_OPS.docx", "_blank")}>
                      <CardContent className="pt-6 text-center">
                        <FileText className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">Reglas de Negocio</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Estados, flujos y logica de visitas, tickets y roles
                        </p>
                        <Button variant="outline" size="sm" className="gap-2" data-testid="button-download-rules">
                          <Download className="h-4 w-4" />
                          Descargar
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={userForm.firstName}
                  onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={userForm.role}
                onValueChange={(v) => setUserForm({ ...userForm, role: v as UserRole })}
              >
                <SelectTrigger data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                data-testid="input-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Contraseña temporal</Label>
              <Input
                type="text"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                data-testid="input-password"
              />
              <p className="text-xs text-muted-foreground">
                El usuario deberá cambiar esta contraseña en su primer ingreso
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createUserMutation.mutate(userForm)}
              disabled={createUserMutation.isPending || !userForm.password || userForm.password.length < 6}
              data-testid="button-submit-create"
            >
              {createUserMutation.isPending ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={userForm.firstName}
                  onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={userForm.role}
                onValueChange={(v) => setUserForm({ ...userForm, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Usuario Activo</Label>
              <Switch
                checked={userForm.isActive}
                onCheckedChange={(checked) => setUserForm({ ...userForm, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => selectedUser && updateUserMutation.mutate({ id: selectedUser.id, data: userForm })}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetear Contrasena</DialogTitle>
            <DialogDescription>
              Se enviara un email al usuario {selectedUser?.email} con instrucciones para crear una nueva contrasena.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUser && resetPasswordMutation.mutate(selectedUser.id)}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Enviando..." : "Resetear Contrasena"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminacion Masiva</DialogTitle>
            <DialogDescription>
              Esta accion eliminara TODAS las transacciones bancarias del edificio "{buildings.find(b => b.id === bulkForm.buildingId)?.name}" para el periodo {bulkForm.periodMonth}/{bulkForm.periodYear}. Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => bulkDeleteMutation.mutate()} disabled={bulkDeleteMutation.isPending} data-testid="button-confirm-bulk-delete">
              {bulkDeleteMutation.isPending ? "Eliminando..." : "Eliminar Todo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearExportConfirm} onOpenChange={setShowClearExportConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Limpieza de Flags</DialogTitle>
            <DialogDescription>
              Se limpiaran los flags de exportacion de todas las transacciones del edificio "{buildings.find(b => b.id === bulkForm.buildingId)?.name}" para el periodo {bulkForm.periodMonth}/{bulkForm.periodYear}. Las transacciones podran ser re-exportadas como nuevas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearExportConfirm(false)}>Cancelar</Button>
            <Button onClick={() => clearExportMutation.mutate()} disabled={clearExportMutation.isPending} data-testid="button-confirm-clear-export">
              {clearExportMutation.isPending ? "Limpiando..." : "Limpiar Flags"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
