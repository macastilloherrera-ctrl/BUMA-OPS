import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogOut, Mail, User, Shield } from "lucide-react";
import type { UserRole } from "@shared/schema";

interface ProfileProps {
  userRole?: UserRole;
}

export default function Profile({ userRole = "ejecutivo_operaciones" }: ProfileProps) {
  const { user, isLoading, logout, isLoggingOut } = useAuth();

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  const getRoleLabel = () => {
    const labels: Record<UserRole, string> = {
      gerente_general: "Gerente General",
      gerente_operaciones: "Gerente de Operaciones",
      gerente_finanzas: "Gerente de Finanzas",
      ejecutivo_operaciones: "Ejecutivo de Operaciones",
    };
    return labels[userRole];
  };

  const getRoleBadgeVariant = () => {
    if (userRole === "gerente_general") return "default";
    if (userRole === "gerente_operaciones") return "default";
    return "secondary";
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-32 w-32 rounded-full mx-auto" />
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Mi Perfil</h1>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">
                {user?.firstName} {user?.lastName}
              </h2>
              <Badge variant={getRoleBadgeVariant()} className="mt-2">
                {getRoleLabel()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informacion de Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email || "No disponible"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">ID de Usuario</p>
                <p className="font-medium text-sm truncate">{user?.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Rol</p>
                <p className="font-medium">{getRoleLabel()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preferencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
              <div>
                <p className="font-medium">Tema de la Aplicacion</p>
                <p className="text-sm text-muted-foreground">Cambia entre modo claro y oscuro</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => logout()}
          disabled={isLoggingOut}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {isLoggingOut ? "Cerrando sesion..." : "Cerrar Sesion"}
        </Button>
      </div>
    </div>
  );
}
