import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

export default function Landing() {
  const { data: devStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/dev-auth/status"],
    retry: false,
  });

  const isDevMode = devStatus?.enabled;

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Logo size="lg" className="mx-auto mb-8" />
          {isDevMode ? (
            <Link href="/dev-login">
              <Button size="lg" data-testid="button-dev-login">Iniciar Sesion</Button>
            </Link>
          ) : (
            <Button size="lg" asChild data-testid="button-login">
              <a href="/api/login">Iniciar Sesion</a>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
