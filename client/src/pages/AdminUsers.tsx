import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Plus, Pencil, Trash2, Building2, UserCheck, UserX, Shield, Search } from "lucide-react";

interface UserProfile {
  id: string;
  role: string;
  buildingScope: string;
  phone: string | null;
  isActive: boolean;
}

interface AdminUser {
  id: string;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  profile: UserProfile | null;
  assignedBuildings: { id: string; name: string }[];
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface Building {
  id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  gerente_general: "Gerente General",
  gerente_operaciones: "Gerente de Operaciones",
  gerente_comercial: "Gerente Comercial",
  gerente_finanzas: "Ejecutivo de Apoyo",
  ejecutivo_operaciones: "Ejecutivo de Operaciones",
  ejecutivo_apoyo: "Ejecutivo de Apoyo",
  conserjeria: "Conserjería",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  gerente_general: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  gerente_operaciones: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  gerente_comercial: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  gerente_finanzas: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ejecutivo_operaciones: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  ejecutivo_apoyo: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  conserjeria: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBuildingsDialog, setShowBuildingsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "ejecutivo_operaciones",
    phone: "",
    password: "",
    isActive: true,
  });

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
  });

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const createUserMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: "Usuario creado exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al crear usuario", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => 
      apiRequest("PATCH", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowEditDialog(false);
      setSelectedUser(null);
      resetForm();
      toast({ title: "Usuario actualizado exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al actualizar usuario", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowDeleteDialog(false);
      setSelectedUser(null);
      toast({ title: "Usuario eliminado exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al eliminar usuario", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/admin/users/${id}/toggle-active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Estado del usuario actualizado" });
    },
    onError: (error: any) => {
      toast({ title: "Error al cambiar estado", description: error.message, variant: "destructive" });
    },
  });

  const assignBuildingsMutation = useMutation({
    mutationFn: ({ id, buildingIds }: { id: string; buildingIds: string[] }) =>
      apiRequest("PATCH", `/api/admin/users/${id}/buildings`, { buildingIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowBuildingsDialog(false);
      setSelectedUser(null);
      toast({ title: "Edificios asignados exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al asignar edificios", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      role: "ejecutivo_operaciones",
      phone: "",
      password: "",
      isActive: true,
    });
  };

  const openEditDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setFormData({
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

  const openBuildingsDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setSelectedBuildings(user.assignedBuildings.map(b => b.id));
    setShowBuildingsDialog(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesRole = roleFilter === "all" || user.profile?.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const usersByRole = {
    managers: filteredUsers.filter(u => ["gerente_general", "gerente_operaciones", "gerente_comercial", "gerente_finanzas"].includes(u.profile?.role || "")),
    executives: filteredUsers.filter(u => u.profile?.role === "ejecutivo_operaciones" || u.profile?.role === "ejecutivo_apoyo"),
    conserjeria: filteredUsers.filter(u => u.profile?.role === "conserjeria"),
    noProfile: filteredUsers.filter(u => !u.profile),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Administración de Usuarios</h1>
            <p className="text-muted-foreground">Gestiona usuarios, roles y permisos</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-user">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-users"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-role-filter">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Usuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.profile?.isActive).length}</p>
                <p className="text-sm text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usersByRole.managers.length}</p>
                <p className="text-sm text-muted-foreground">Gerentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                <Building2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usersByRole.executives.length}</p>
                <p className="text-sm text-muted-foreground">Ejecutivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Todos ({filteredUsers.length})</TabsTrigger>
          <TabsTrigger value="managers">Gerentes ({usersByRole.managers.length})</TabsTrigger>
          <TabsTrigger value="executives">Ejecutivos ({usersByRole.executives.length})</TabsTrigger>
          <TabsTrigger value="conserjeria">Conserjería ({usersByRole.conserjeria.length})</TabsTrigger>
          {usersByRole.noProfile.length > 0 && (
            <TabsTrigger value="no-profile">Sin Perfil ({usersByRole.noProfile.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all">
          <UserTable 
            users={filteredUsers} 
            onEdit={openEditDialog}
            onDelete={(user) => { setSelectedUser(user); setShowDeleteDialog(true); }}
            onToggleActive={(user) => toggleActiveMutation.mutate(user.id)}
            onAssignBuildings={openBuildingsDialog}
          />
        </TabsContent>
        <TabsContent value="managers">
          <UserTable 
            users={usersByRole.managers} 
            onEdit={openEditDialog}
            onDelete={(user) => { setSelectedUser(user); setShowDeleteDialog(true); }}
            onToggleActive={(user) => toggleActiveMutation.mutate(user.id)}
            onAssignBuildings={openBuildingsDialog}
          />
        </TabsContent>
        <TabsContent value="executives">
          <UserTable 
            users={usersByRole.executives} 
            onEdit={openEditDialog}
            onDelete={(user) => { setSelectedUser(user); setShowDeleteDialog(true); }}
            onToggleActive={(user) => toggleActiveMutation.mutate(user.id)}
            onAssignBuildings={openBuildingsDialog}
          />
        </TabsContent>
        <TabsContent value="conserjeria">
          <UserTable 
            users={usersByRole.conserjeria} 
            onEdit={openEditDialog}
            onDelete={(user) => { setSelectedUser(user); setShowDeleteDialog(true); }}
            onToggleActive={(user) => toggleActiveMutation.mutate(user.id)}
            onAssignBuildings={openBuildingsDialog}
          />
        </TabsContent>
        {usersByRole.noProfile.length > 0 && (
          <TabsContent value="no-profile">
            <UserTable 
              users={usersByRole.noProfile} 
              onEdit={openEditDialog}
              onDelete={(user) => { setSelectedUser(user); setShowDeleteDialog(true); }}
              onToggleActive={(user) => toggleActiveMutation.mutate(user.id)}
              onAssignBuildings={openBuildingsDialog}
            />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>Ingresa los datos del nuevo usuario</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
                data-testid="input-user-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  data-testid="input-user-firstname"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  data-testid="input-user-lastname"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role">Rol *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="password">Contraseña temporal *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Contraseña inicial del usuario"
                data-testid="input-user-password"
              />
              <p className="text-xs text-muted-foreground mt-1">El usuario deberá cambiarla en su primer ingreso</p>
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+56 9 1234 5678"
                data-testid="input-user-phone"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-user-active"
              />
              <Label htmlFor="isActive">Usuario activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createUserMutation.mutate(formData)}
              disabled={createUserMutation.isPending || !formData.email || !formData.password}
              data-testid="button-submit-create-user"
            >
              {createUserMutation.isPending ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifica los datos del usuario</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-edit-user-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-firstName">Nombre</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  data-testid="input-edit-user-firstname"
                />
              </div>
              <div>
                <Label htmlFor="edit-lastName">Apellido</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  data-testid="input-edit-user-lastname"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-role">Rol</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger data-testid="select-edit-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-phone">Teléfono</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="input-edit-user-phone"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-edit-user-active"
              />
              <Label htmlFor="edit-isActive">Usuario activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedUser(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (!selectedUser) return;
                const { password, ...editData } = formData;
                updateUserMutation.mutate({ id: selectedUser.id, data: editData as typeof formData });
              }}
              disabled={updateUserMutation.isPending}
              data-testid="button-submit-edit-user"
            >
              {updateUserMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar a {selectedUser?.firstName} {selectedUser?.lastName}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setSelectedUser(null); }}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBuildingsDialog} onOpenChange={setShowBuildingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Edificios</DialogTitle>
            <DialogDescription>
              Selecciona los edificios para {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-2">
              {buildings.map(building => (
                <div key={building.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted">
                  <Checkbox
                    id={`building-${building.id}`}
                    checked={selectedBuildings.includes(building.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedBuildings([...selectedBuildings, building.id]);
                      } else {
                        setSelectedBuildings(selectedBuildings.filter(id => id !== building.id));
                      }
                    }}
                    data-testid={`checkbox-building-${building.id}`}
                  />
                  <Label htmlFor={`building-${building.id}`} className="flex-1 cursor-pointer">
                    {building.name}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBuildingsDialog(false); setSelectedUser(null); }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => selectedUser && assignBuildingsMutation.mutate({ id: selectedUser.id, buildingIds: selectedBuildings })}
              disabled={assignBuildingsMutation.isPending}
              data-testid="button-submit-assign-buildings"
            >
              {assignBuildingsMutation.isPending ? "Asignando..." : "Guardar Asignaciones"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserTable({ 
  users, 
  onEdit, 
  onDelete, 
  onToggleActive,
  onAssignBuildings,
}: { 
  users: AdminUser[];
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onToggleActive: (user: AdminUser) => void;
  onAssignBuildings: (user: AdminUser) => void;
}) {
  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay usuarios que coincidan con los filtros</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Usuario</th>
                <th className="text-left p-4 font-medium">Rol</th>
                <th className="text-left p-4 font-medium">Estado</th>
                <th className="text-left p-4 font-medium">Edificios</th>
                <th className="text-right p-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-muted/30" data-testid={`row-user-${user.id}`}>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">
                        {user.firstName || user.lastName 
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                          : "Sin nombre"}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.username || user.email || "Sin email"}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    {user.profile ? (
                      <Badge className={roleColors[user.profile.role] || ""}>
                        {roleLabels[user.profile.role] || user.profile.role}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Sin perfil</Badge>
                    )}
                  </td>
                  <td className="p-4">
                    {user.profile?.isActive ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <UserX className="h-3 w-3 mr-1" />
                        Inactivo
                      </Badge>
                    )}
                  </td>
                  <td className="p-4">
                    {["ejecutivo_operaciones", "conserjeria"].includes(user.profile?.role || "") ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{user.assignedBuildings.length} edificio(s)</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => onAssignBuildings(user)}
                          data-testid={`button-assign-buildings-${user.id}`}
                        >
                          <Building2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => onToggleActive(user)}
                        data-testid={`button-toggle-active-${user.id}`}
                      >
                        {user.profile?.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => onEdit(user)}
                        data-testid={`button-edit-user-${user.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(user)}
                        data-testid={`button-delete-user-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
