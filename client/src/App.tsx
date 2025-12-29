import { Switch, Route, Redirect, useLocation } from "wouter";
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
import { getRoleHome, canAccessRoute, isManagerRole, isFinanceRole } from "@/lib/roleRoutes";

import { Logo } from "@/components/Logo";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import Visits from "@/pages/Visits";
import VisitDetail from "@/pages/VisitDetail";
import VisitInProgress from "@/pages/VisitInProgress";
import IncidentForm from "@/pages/IncidentForm";
import ScheduleVisit from "@/pages/ScheduleVisit";
import Tickets from "@/pages/Tickets";
import NewTicket from "@/pages/NewTicket";
import TicketDetail from "@/pages/TicketDetail";
import Buildings from "@/pages/Buildings";
import BuildingDetail from "@/pages/BuildingDetail";
import CriticalAssets from "@/pages/CriticalAssets";
import Profile from "@/pages/Profile";
import DashboardTickets from "@/pages/DashboardTickets";
import DashboardVisits from "@/pages/DashboardVisits";
import DashboardOverview from "@/pages/DashboardOverview";
import Maintainers from "@/pages/Maintainers";
import CalendarView from "@/pages/CalendarView";
import DevLogin from "@/pages/DevLogin";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Logo size="lg" className="mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-3 w-24 mx-auto" />
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";

function RouteGuard({ userRole, children }: { userRole: UserRole; children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const roleHome = getRoleHome(userRole);
  const lastRedirectedPath = useRef<string | null>(null);
  
  const canAccess = canAccessRoute(userRole, location);
  
  useEffect(() => {
    if (canAccess) {
      lastRedirectedPath.current = null;
    } else if (lastRedirectedPath.current !== location) {
      lastRedirectedPath.current = location;
      setLocation(roleHome);
    }
  }, [canAccess, location, roleHome, setLocation]);
  
  if (!canAccess) {
    return null;
  }
  
  return <>{children}</>;
}

function AuthenticatedApp() {
  const { user, logout } = useAuth();

  const { data: userProfile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });

  if (profileLoading) {
    return <LoadingScreen />;
  }

  const userRole: UserRole = userProfile?.role || "ejecutivo_operaciones";
  const isGeneralManager = userRole === "gerente_general";
  const isFinance = isFinanceRole(userRole);
  const isManager = isManagerRole(userRole);
  const roleHome = getRoleHome(userRole);

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
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground" data-testid="text-user-info">
                Conectado como: {user.email} ({userRole.replace("_", " ")})
              </span>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-hidden">
            <RouteGuard userRole={userRole}>
              <Switch>
                <Route path="/" component={() => <Redirect to={roleHome} />} />
                
                {isGeneralManager && (
                  <Route path="/dashboard/overview" component={DashboardOverview} />
                )}
                
                {(isManager || isFinance) && (
                  <>
                    <Route path="/dashboard/tickets" component={DashboardTickets} />
                  </>
                )}

                {isManager && (
                  <Route path="/dashboard/visitas" component={DashboardVisits} />
                )}

                <Route path="/visitas" component={Visits} />
                <Route path="/visitas/programar" component={ScheduleVisit} />
                <Route path="/visitas/:id" component={VisitDetail} />
                <Route path="/visitas/:id/en-curso" component={VisitInProgress} />
                <Route path="/visitas/:id/incidente" component={IncidentForm} />

                <Route path="/tickets" component={Tickets} />
                <Route path="/tickets/nuevo" component={NewTicket} />
                <Route path="/tickets/:id" component={TicketDetail} />
                <Route path="/calendario" component={CalendarView} />

                <Route path="/edificios" component={Buildings} />
                <Route path="/edificios/:id" component={BuildingDetail} />
                <Route path="/equipos" component={CriticalAssets} />
                
                {isManager && (
                  <Route path="/mantenedores" component={Maintainers} />
                )}
                <Route path="/perfil" component={() => <Profile userRole={userRole} />} />

                <Route component={NotFound} />
              </Switch>
            </RouteGuard>
          </main>
        </div>

        <MobileNav />
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    if (location === "/dev-login") {
      return <DevLogin />;
    }
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
