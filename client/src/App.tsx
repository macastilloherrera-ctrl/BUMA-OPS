import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { UserProfile, UserRole } from "@shared/schema";

import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import Visits from "@/pages/Visits";
import VisitDetail from "@/pages/VisitDetail";
import VisitInProgress from "@/pages/VisitInProgress";
import ScheduleVisit from "@/pages/ScheduleVisit";
import Tickets from "@/pages/Tickets";
import CreateTicket from "@/pages/CreateTicket";
import Buildings from "@/pages/Buildings";
import CriticalAssets from "@/pages/CriticalAssets";
import Profile from "@/pages/Profile";
import DashboardTickets from "@/pages/DashboardTickets";
import DashboardVisits from "@/pages/DashboardVisits";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold mx-auto">
          B
        </div>
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-3 w-24 mx-auto" />
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { user, logout } = useAuth();

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });

  const userRole: UserRole = userProfile?.role || "ejecutivo_operaciones";
  const isManager = userRole === "gerente_general" || userRole === "gerente_operaciones";
  const isFinance = userRole === "gerente_finanzas";

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (!user) return null;

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <div className="hidden md:block">
          <DesktopSidebar user={user} userRole={userRole} onLogout={logout} />
        </div>
        
        <div className="flex flex-col flex-1 min-w-0">
          <header className="hidden md:flex items-center justify-between gap-4 p-3 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>

          <main className="flex-1 overflow-hidden">
            <Switch>
              {isManager && (
                <>
                  <Route path="/" component={() => <Redirect to="/dashboard/tickets" />} />
                  <Route path="/dashboard/tickets" component={DashboardTickets} />
                  <Route path="/dashboard/visitas" component={DashboardVisits} />
                </>
              )}

              {isFinance && (
                <>
                  <Route path="/" component={() => <Redirect to="/dashboard/tickets" />} />
                  <Route path="/dashboard/tickets" component={DashboardTickets} />
                </>
              )}

              {!isManager && !isFinance && (
                <Route path="/" component={() => <Redirect to="/visitas" />} />
              )}

              <Route path="/visitas" component={Visits} />
              <Route path="/visitas/programar" component={ScheduleVisit} />
              <Route path="/visitas/:id" component={VisitDetail} />
              <Route path="/visitas/:id/en-curso" component={VisitInProgress} />

              <Route path="/tickets" component={Tickets} />
              <Route path="/tickets/nuevo" component={CreateTicket} />

              <Route path="/edificios" component={Buildings} />
              <Route path="/equipos" component={CriticalAssets} />
              <Route path="/perfil" component={() => <Profile userRole={userRole} />} />

              <Route component={NotFound} />
            </Switch>
          </main>
        </div>

        <MobileNav />
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
