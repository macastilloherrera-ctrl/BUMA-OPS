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
import { Settings, Users, Key, Shield, Building2, Save, RefreshCw, UserPlus, Pencil, ToggleLeft, Upload, FileText, Image, Download, Book, Code } from "lucide-react";
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

  const updateConfigMutation = useMutation({
    mutationFn: (data: typeof configForm) => apiRequest("PATCH", "/api/super-admin/config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/config"] });
      toast({ title: "Configuracion actualizada" });
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
              Configuracion del sistema y gestion avanzada
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
                Configuracion
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
                <Users className="h-4 w-4" />
                Usuarios
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2" data-testid="tab-logs">
                <FileText className="h-4 w-4" />
                Logs
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
                      {updateConfigMutation.isPending ? "Guardando..." : "Guardar Configuracion"}
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
                <h2 className="text-lg font-semibold">Gestion de Usuarios</h2>
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
                    Logs del Sistema
                  </CardTitle>
                  <CardDescription>
                    Registro de actividad del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        Ultimas actividades del sistema
                      </p>
                      <Button variant="outline" size="sm" disabled>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualizar
                      </Button>
                    </div>
                    <div className="border rounded-lg p-4 bg-muted/30 min-h-[300px] flex flex-col items-center justify-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center">
                        El sistema de logs esta en desarrollo.
                      </p>
                      <p className="text-sm text-muted-foreground text-center mt-2">
                        Proximamente podras ver el registro de actividades del sistema aqui.
                      </p>
                    </div>
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
                          Guia completa para usuarios del sistema con instrucciones por rol
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
                        <h3 className="font-semibold mb-2">Guia de Administracion</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Manual para administradores del sistema y gestion de usuarios
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
                        <h3 className="font-semibold mb-2">Documentacion Tecnica</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Arquitectura, APIs y modelo de datos para desarrolladores
                        </p>
                        <Button variant="outline" size="sm" className="gap-2" data-testid="button-download-tech">
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
              <Label>Telefono</Label>
              <Input
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                data-testid="input-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Nota de acceso</Label>
              <Input
                type="text"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Referencia interna (ej: enviado por email)"
                data-testid="input-password"
              />
              <p className="text-xs text-muted-foreground">
                El usuario iniciara sesion con su cuenta de Replit
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createUserMutation.mutate({ ...userForm, password: userForm.password || "pendiente" })}
              disabled={createUserMutation.isPending}
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
    </div>
  );
}
