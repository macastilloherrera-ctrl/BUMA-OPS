import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, ClipboardCheck, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

export default function Landing() {
  const { data: devStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/dev-auth/status"],
    retry: false,
  });

  const isDevMode = devStatus?.enabled;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Logo size="lg" />
            {isDevMode && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                DEV
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isDevMode ? (
              <Link href="/dev-login">
                <Button data-testid="button-dev-login">Dev Login</Button>
              </Link>
            ) : (
              <Button asChild data-testid="button-login">
                <a href="/api/login">Iniciar Sesion</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Gestion de Operaciones Simplificada
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Plataforma interna para ordenar operaciones: visitas a terreno, tickets, 
            incidentes urgentes y equipos criticos.
          </p>
          {isDevMode ? (
            <Link href="/dev-login">
              <Button size="lg" data-testid="button-dev-login-hero">Acceder (Dev Mode)</Button>
            </Link>
          ) : (
            <Button size="lg" asChild data-testid="button-login-hero">
              <a href="/api/login">Acceder a la Plataforma</a>
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Visitas a Terreno</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Programa y registra visitas con checklists, fotos y notas. 
                Mobile-first para trabajo en campo.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Tickets Operativos</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Gestiona hallazgos y tareas con sistema de prioridades 
                semaforo y seguimiento de responsables.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Equipos Criticos</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Catalogo de equipos por edificio: ascensores, bombas, 
                portones, CCTV y mas.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Dashboards</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Vision ejecutiva de tickets, visitas y cobertura 
                de edificios en tiempo real.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          BUMA OPS - Plataforma Interna de Operaciones
        </div>
      </footer>
    </div>
  );
}
