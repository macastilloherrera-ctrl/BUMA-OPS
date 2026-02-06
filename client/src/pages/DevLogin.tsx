import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Briefcase, HardHat, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface DevUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  label: string;
}

const roleIcons: Record<string, typeof User> = {
  gerente_general: Shield,
  gerente_operaciones: Briefcase,
  gerente_finanzas: Briefcase,
  ejecutivo_operaciones: HardHat,
};

const roleColors: Record<string, string> = {
  gerente_general: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  gerente_operaciones: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  gerente_finanzas: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ejecutivo_operaciones: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default function DevLogin() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery<DevUser[]>({
    queryKey: ["/api/dev-auth/users"],
  });

  const loginMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", "/api/dev-auth/login", { userId });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      const redirectTo = data.redirectTo || "/";
      window.location.href = redirectTo;
    },
  });

  const handleLogin = (userId: string) => {
    setSelectedUser(userId);
    loginMutation.mutate(userId);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo size="lg" />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              DEV MODE
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Dev Login</h1>
            <p className="text-muted-foreground">
              Selecciona un usuario para iniciar sesion en modo desarrollo
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4">
              {users?.map((user) => {
                const Icon = roleIcons[user.role] || User;
                const isSelected = selectedUser === user.id;
                const isPending = loginMutation.isPending && isSelected;

                return (
                  <Card
                    key={user.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => !loginMutation.isPending && handleLogin(user.id)}
                    data-testid={`card-user-${user.id}`}
                  >
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {user.label}
                          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        </CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                      </div>
                      <Badge className={roleColors[user.role] || ""}>
                        {user.role.replace("_", " ")}
                      </Badge>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {user.role === "gerente_general" && "Acceso total: dashboards, tickets, visitas, edificios, equipos, costos"}
                        {user.role === "gerente_operaciones" && "Gestión de tickets y visitas, acceso a costos"}
                        {user.role === "gerente_finanzas" && "Solo lectura en dashboards"}
                        {user.role === "ejecutivo_operaciones" && "Trabajo de campo: visitas y tickets asignados"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {loginMutation.isError && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md text-center">
              Error al iniciar sesion. Intenta de nuevo.
            </div>
          )}

          <div className="mt-8 text-center">
            <Button variant="outline" asChild data-testid="button-oauth-login">
              <a href="/api/login">Usar Replit OAuth</a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
