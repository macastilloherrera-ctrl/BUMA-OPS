import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  Building2,
  MapPin,
  User,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Folder,
  File,
  FolderPlus,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import type { Building, BuildingStaff, BuildingFeature, BuildingFolder, BuildingFile, UserProfile } from "@shared/schema";

const staffFormSchema = z.object({
  fullName: z.string().min(1, "Nombre requerido"),
  role: z.string().min(1, "Cargo requerido"),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
});

type StaffFormData = z.infer<typeof staffFormSchema>;

const folderFormSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
});

type FolderFormData = z.infer<typeof folderFormSchema>;

interface BuildingWithExecutive extends Building {
  executiveName?: string;
}

export default function BuildingDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<BuildingFolder | null>(null);

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });

  const isManager = userProfile?.role && ["gerente_general", "gerente_operaciones"].includes(userProfile.role);

  const { data: building, isLoading: buildingLoading } = useQuery<BuildingWithExecutive>({
    queryKey: ["/api/buildings", id],
  });

  const { data: staff, isLoading: staffLoading } = useQuery<BuildingStaff[]>({
    queryKey: ["/api/buildings", id, "staff"],
    enabled: !!id,
  });

  const { data: features } = useQuery<BuildingFeature[]>({
    queryKey: ["/api/buildings", id, "features"],
    enabled: !!id,
  });

  const { data: folders, isLoading: foldersLoading } = useQuery<BuildingFolder[]>({
    queryKey: ["/api/buildings", id, "folders"],
    enabled: !!id && isManager,
  });

  const { data: files, isLoading: filesLoading } = useQuery<BuildingFile[]>({
    queryKey: ["/api/building-folders", selectedFolder?.id, "files"],
    enabled: !!selectedFolder?.id && isManager,
  });

  const staffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      fullName: "",
      role: "",
      birthDate: "",
      phone: "",
      email: "",
    },
  });

  const folderForm = useForm<FolderFormData>({
    resolver: zodResolver(folderFormSchema),
    defaultValues: { name: "" },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const payload = {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        phone: data.phone || null,
        email: data.email || null,
      };
      const res = await apiRequest("POST", `/api/buildings/${id}/staff`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings", id, "staff"] });
      toast({ title: "Personal agregado" });
      setIsStaffDialogOpen(false);
      staffForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo agregar el personal", variant: "destructive" });
    },
  });

  const toggleStaffStatusMutation = useMutation({
    mutationFn: async ({ staffId, isActive, deactivatedBy }: { staffId: string; isActive: boolean; deactivatedBy: string | null }) => {
      const payload = {
        isActive,
        deactivatedAt: isActive ? null : new Date(),
        deactivatedBy: isActive ? null : deactivatedBy,
      };
      const res = await apiRequest("PATCH", `/api/building-staff/${staffId}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings", id, "staff"] });
      toast({ title: "Estado actualizado" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: FolderFormData) => {
      const res = await apiRequest("POST", `/api/buildings/${id}/folders`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings", id, "folders"] });
      toast({ title: "Carpeta creada" });
      setIsFolderDialogOpen(false);
      folderForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear la carpeta", variant: "destructive" });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      await apiRequest("DELETE", `/api/building-folders/${folderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings", id, "folders"] });
      toast({ title: "Carpeta eliminada" });
      setSelectedFolder(null);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar la carpeta", variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest("DELETE", `/api/building-files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/building-folders", selectedFolder?.id, "files"] });
      toast({ title: "Archivo eliminado" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el archivo", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      activo: { label: "Activo", variant: "default" },
      inactivo: { label: "Inactivo", variant: "secondary" },
      en_revision: { label: "En Revision", variant: "outline" },
    };
    const { label, variant } = config[status] || config.activo;
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (buildingLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!building) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Edificio no encontrado
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeStaff = staff?.filter(s => s.isActive) || [];
  const inactiveStaff = staff?.filter(s => !s.isActive) || [];

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-50 px-4 py-3 md:px-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/buildings">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-building-name">
              {building.name}
            </h1>
            {getStatusBadge(building.status)}
          </div>
          {isManager && (
            <Link href={`/buildings`}>
              <Button variant="outline" size="sm" data-testid="button-edit-building">
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </Link>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="info" data-testid="tab-info">Informacion</TabsTrigger>
              <TabsTrigger value="staff" data-testid="tab-staff">Personal ({staff?.length || 0})</TabsTrigger>
              {isManager && (
                <TabsTrigger value="folders" data-testid="tab-folders">Documentos</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Datos Generales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <span data-testid="text-building-address">{building.address}</span>
                  </div>
                  {building.executiveName && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Ejecutivo: {building.executiveName}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Caracteristicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-md">
                      <div className="text-2xl font-bold" data-testid="text-department-count">
                        {building.departmentCount || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Departamentos</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-md">
                      <div className="text-2xl font-bold" data-testid="text-elevator-count">
                        {building.elevatorCount || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Ascensores</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-md">
                      <div className="text-2xl font-bold" data-testid="text-gate-count">
                        {building.gateCount || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Portones</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-md">
                      <div className="text-2xl font-bold" data-testid="text-extinguisher-count">
                        {building.extinguisherCount || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Extintores</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-md">
                      <div className="text-2xl font-bold" data-testid="text-parking-count">
                        {building.visitorParkingCount || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Est. Visitas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {features && features.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Caracteristicas Adicionales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {features.map((f) => (
                        <div key={f.id} className="flex justify-between p-2 bg-muted/50 rounded-md">
                          <span className="text-sm font-medium">{f.name}</span>
                          {f.value && <span className="text-sm text-muted-foreground">{f.value}</span>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="staff" className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-lg font-medium">Personal del Edificio</h2>
                {isManager && (
                  <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-staff">
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Agregar Personal</DialogTitle>
                      </DialogHeader>
                      <Form {...staffForm}>
                        <form onSubmit={staffForm.handleSubmit((data) => createStaffMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={staffForm.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre Completo *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Juan Perez" {...field} data-testid="input-staff-fullname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={staffForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cargo *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Conserje" {...field} data-testid="input-staff-role" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={staffForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Telefono</FormLabel>
                                  <FormControl>
                                    <Input placeholder="+56912345678" {...field} data-testid="input-staff-phone" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={staffForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input placeholder="email@ejemplo.com" {...field} data-testid="input-staff-email" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={staffForm.control}
                            name="birthDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fecha de Nacimiento</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} data-testid="input-staff-birthdate" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button type="submit" disabled={createStaffMutation.isPending} data-testid="button-submit-staff">
                              {createStaffMutation.isPending ? "Guardando..." : "Guardar"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {staffLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <>
                  {activeStaff.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Activos ({activeStaff.length})</h3>
                      <div className="grid gap-2">
                        {activeStaff.map((s) => (
                          <Card key={s.id} data-testid={`card-staff-${s.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium" data-testid={`text-staff-name-${s.id}`}>{s.fullName}</span>
                                    <Badge variant="outline" className="text-xs">{s.role}</Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                    {s.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {s.phone}
                                      </span>
                                    )}
                                    {s.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {s.email}
                                      </span>
                                    )}
                                    {s.birthDate && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(s.birthDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isManager && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleStaffStatusMutation.mutate({
                                      staffId: s.id,
                                      isActive: false,
                                      deactivatedBy: user?.id || null,
                                    })}
                                    disabled={toggleStaffStatusMutation.isPending}
                                    data-testid={`button-deactivate-staff-${s.id}`}
                                  >
                                    <UserX className="h-4 w-4 mr-1" />
                                    Desactivar
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {inactiveStaff.length > 0 && (
                    <div className="space-y-2 mt-6">
                      <h3 className="text-sm font-medium text-muted-foreground">Inactivos ({inactiveStaff.length})</h3>
                      <div className="grid gap-2">
                        {inactiveStaff.map((s) => (
                          <Card key={s.id} className="opacity-60" data-testid={`card-staff-inactive-${s.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{s.fullName}</span>
                                    <Badge variant="secondary" className="text-xs">{s.role}</Badge>
                                  </div>
                                  {s.deactivatedAt && (
                                    <div className="text-xs text-muted-foreground">
                                      Desactivado: {new Date(s.deactivatedAt).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                                {isManager && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleStaffStatusMutation.mutate({
                                      staffId: s.id,
                                      isActive: true,
                                      deactivatedBy: null,
                                    })}
                                    disabled={toggleStaffStatusMutation.isPending}
                                    data-testid={`button-activate-staff-${s.id}`}
                                  >
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Activar
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {staff?.length === 0 && (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No hay personal registrado
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {isManager && (
              <TabsContent value="folders" className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">Carpetas</h3>
                      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid="button-add-folder">
                            <FolderPlus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Nueva Carpeta</DialogTitle>
                          </DialogHeader>
                          <Form {...folderForm}>
                            <form onSubmit={folderForm.handleSubmit((data) => createFolderMutation.mutate(data))} className="space-y-4">
                              <FormField
                                control={folderForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nombre *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Nombre de la carpeta" {...field} data-testid="input-folder-name" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button type="submit" disabled={createFolderMutation.isPending} data-testid="button-submit-folder">
                                  {createFolderMutation.isPending ? "Creando..." : "Crear"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {foldersLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {folders?.map((folder) => (
                          <div
                            key={folder.id}
                            className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover-elevate ${
                              selectedFolder?.id === folder.id ? "bg-accent" : ""
                            }`}
                            onClick={() => setSelectedFolder(folder)}
                            data-testid={`folder-item-${folder.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <Folder className="h-4 w-4" />
                              <span className="text-sm">{folder.name}</span>
                              {folder.isDefault && (
                                <Badge variant="outline" className="text-xs">Predeterminada</Badge>
                              )}
                            </div>
                            {!folder.isDefault && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100"
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`button-delete-folder-${folder.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminar carpeta</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta accion eliminara la carpeta y todos sus archivos. Esta accion no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteFolderMutation.mutate(folder.id)}
                                      data-testid="button-confirm-delete-folder"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        ))}
                        {folders?.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No hay carpetas
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    {selectedFolder ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            {selectedFolder.name}
                          </CardTitle>
                          <CardDescription>
                            Archivos en esta carpeta
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {filesLoading ? (
                            <div className="space-y-2">
                              <Skeleton className="h-10 w-full" />
                              <Skeleton className="h-10 w-full" />
                            </div>
                          ) : files && files.length > 0 ? (
                            <div className="space-y-2">
                              {files.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center justify-between p-2 border rounded-md"
                                  data-testid={`file-item-${file.id}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <File className="h-4 w-4" />
                                    <span className="text-sm">{file.fileName}</span>
                                  </div>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        data-testid={`button-delete-file-${file.id}`}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Eliminar archivo</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta accion no se puede deshacer.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteFileMutation.mutate(file.id)}
                                          data-testid="button-confirm-delete-file"
                                        >
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No hay archivos en esta carpeta
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                          Selecciona una carpeta para ver sus archivos
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
