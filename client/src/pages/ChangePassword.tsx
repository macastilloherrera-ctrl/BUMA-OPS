import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface UserProfile {
  role: string;
}

function getRedirectByRole(role: string): string {
  switch (role) {
    case "super_admin":
      return "/super-admin";
    case "gerente_general":
    case "gerente_operaciones":
    case "gerente_comercial":
      return "/dashboard/tickets";
    case "gerente_finanzas":
      return "/dashboard/tickets";
    case "ejecutivo_operaciones":
      return "/visitas";
    default:
      return "/dashboard/tickets";
  }
}

export default function ChangePassword() {
  const [, setLocation] = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/change-password", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al cambiar la contraseña");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      if (profile?.role) {
        const redirectTo = getRedirectByRole(profile.role);
        setLocation(redirectTo);
      } else {
        setLocation("/dashboard/tickets");
      }
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    changePasswordMutation.mutate({ newPassword });
  };

  const passwordsMatch = newPassword.length >= 6 && newPassword === confirmPassword;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo size="lg" />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Cambiar Contraseña</CardTitle>
            <CardDescription>
              Por seguridad, debes crear una nueva contraseña para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <div className="relative flex items-center">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    disabled={changePasswordMutation.isPending}
                    autoComplete="new-password"
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    data-testid="button-toggle-new-password"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative flex items-center">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repite tu nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    disabled={changePasswordMutation.isPending}
                    autoComplete="new-password"
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && (
                  <div className="flex items-center gap-2 text-sm">
                    {passwordsMatch ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Las contraseñas coinciden</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Las contraseñas no coinciden</span>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md" data-testid="text-error">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={changePasswordMutation.isPending || !passwordsMatch}
                data-testid="button-change-password"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar nueva contraseña"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
        BUMA OPS - Plataforma de Operaciones
      </footer>
    </div>
  );
}
