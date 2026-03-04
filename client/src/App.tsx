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
import { usePermissions, canAccessRouteDynamic } from "@/hooks/use-permissions";

import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
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
import VisitReport from "@/pages/VisitReport";
import DevLogin from "@/pages/DevLogin";
import Login from "@/pages/Login";
import ChangePassword from "@/pages/ChangePassword";
import Executives from "@/pages/Executives";
import ExpenseReport from "@/pages/ExpenseReport";
import RegulatoryComplianceReport from "@/pages/RegulatoryComplianceReport";
import ReportVisits from "@/pages/ReportVisits";
import ReportTickets from "@/pages/ReportTickets";
import ReportFinancial from "@/pages/ReportFinancial";
import ReportEquipment from "@/pages/ReportEquipment";
import ReportExecutives from "@/pages/ReportExecutives";
import AdminUsers from "@/pages/AdminUsers";
import SuperAdminPanel from "@/pages/SuperAdminPanel";
import Projects from "@/pages/Projects";
import NewProject from "@/pages/NewProject";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectsSemaforo from "@/pages/ProjectsSemaforo";
import ProjectsCalendar from "@/pages/ProjectsCalendar";
import Ingresos from "@/pages/Ingresos";
import ConciliacionBancaria from "@/pages/ConciliacionBancaria";
import HistorialPagos from "@/pages/HistorialPagos";
import Egresos from "@/pages/Egresos";
import RecurringExpenses from "@/pages/RecurringExpenses";
import CierreMensual from "@/pages/CierreMensual";
import ConsultaOperacional from "@/pages/ConsultaOperacional";
import VerificacionGGCC from "@/pages/VerificacionGGCC";
import GestionPermisos from "@/pages/GestionPermisos";
import ChatIA from "@/pages/ChatIA";
import MonitoreoChat from "@/pages/MonitoreoChat";

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

function RouteGuard({ allowedRoutes, homeRoute, children }: { allowedRoutes: string[]; homeRoute: string; children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const lastRedirectedPath = useRef<string | null>(null);
  
  const canAccess = canAccessRouteDynamic(allowedRoutes, location);
  
  useEffect(() => {
    if (canAccess) {
      lastRedirectedPath.current = null;
    } else if (lastRedirectedPath.current !== location) {
      lastRedirectedPath.current = location;
      setLocation(homeRoute);
    }
  }, [canAccess, location, homeRoute, setLocation]);
  
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

  const userRole: UserRole = userProfile?.role || "ejecutivo_operaciones";
  const permissions = usePermissions(userRole);

  if (profileLoading || permissions.isLoading) {
    return <LoadingScreen />;
  }

  const m = permissions.modules;

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (!user) return null;

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <div className="hidden md:block">
          <DesktopSidebar user={user} userRole={userRole} onLogout={logout} permissions={permissions} />
        </div>
        
        <div className="flex flex-col flex-1 min-w-0">
          <header className="hidden md:flex items-center justify-between gap-4 p-3 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground" data-testid="text-user-info">
                Conectado como: {user.email} ({{
                  super_admin: "Super Admin",
                  gerente_general: "Gerente General",
                  gerente_operaciones: "Gerente Operaciones",
                  gerente_comercial: "Gerente Comercial",
                  gerente_finanzas: "Ejecutivo de Apoyo",
                  ejecutivo_operaciones: "Ejecutivo Operaciones",
                  conserjeria: "Conserjería",
                }[userRole] || userRole})
              </span>
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <RouteGuard allowedRoutes={permissions.allowedRoutes} homeRoute={permissions.homeRoute}>
              <Switch>
                <Route path="/" component={() => <Redirect to={permissions.homeRoute} />} />
                
                {m.dashboard_overview && (
                  <Route path="/dashboard/overview" component={DashboardOverview} />
                )}
                
                {m.dashboard_tickets && (
                  <Route path="/dashboard/tickets" component={DashboardTickets} />
                )}

                {m.dashboard_visitas && (
                  <Route path="/dashboard/visitas" component={DashboardVisits} />
                )}

                {m.visitas && (
                  <>
                    <Route path="/visitas" component={Visits} />
                    <Route path="/visitas/programar" component={ScheduleVisit} />
                    <Route path="/visitas/:id" component={VisitDetail} />
                    <Route path="/visitas/:id/en-curso" component={VisitInProgress} />
                    <Route path="/visitas/:id/incidente" component={IncidentForm} />
                    <Route path="/visitas/:id/informe" component={VisitReport} />
                  </>
                )}

                {m.tickets && (
                  <>
                    <Route path="/tickets" component={Tickets} />
                    <Route path="/tickets/nuevo" component={NewTicket} />
                    <Route path="/tickets/:id" component={TicketDetail} />
                  </>
                )}

                {m.calendario && (
                  <Route path="/calendario" component={CalendarView} />
                )}

                {m.edificios && (
                  <>
                    <Route path="/edificios" component={Buildings} />
                    <Route path="/edificios/:id" component={BuildingDetail} />
                  </>
                )}

                {m.equipos_criticos && (
                  <Route path="/equipos" component={CriticalAssets} />
                )}
                
                {m.proyectos && (
                  <>
                    <Route path="/proyectos" component={Projects} />
                    <Route path="/proyectos/semaforo" component={ProjectsSemaforo} />
                    <Route path="/proyectos/calendario" component={ProjectsCalendar} />
                    <Route path="/proyectos/nuevo" component={NewProject} />
                    <Route path="/proyectos/:id" component={ProjectDetail} />
                  </>
                )}
                
                {m.egresos && (
                  <Route path="/egresos" component={Egresos} />
                )}

                {m.cierre_mensual && (
                  <Route path="/cierre-mensual" component={CierreMensual} />
                )}

                {m.conciliacion_bancaria && (
                  <Route path="/conciliacion-bancaria" component={ConciliacionBancaria} />
                )}

                {m.ingresos && (
                  <Route path="/ingresos" component={Ingresos} />
                )}

                {m.consumos_recurrentes && (
                  <Route path="/consumos-recurrentes" component={RecurringExpenses} />
                )}

                {m.consulta_operacional && (
                  <Route path="/consulta-operacional" component={ConsultaOperacional} />
                )}

                {m.verificacion_ggcc && (
                  <Route path="/verificacion-ggcc" component={VerificacionGGCC} />
                )}

                {m.historial_pagos && (
                  <Route path="/historial-pagos" component={HistorialPagos} />
                )}

                {m.mantenedores && (
                  <Route path="/mantenedores" component={Maintainers} />
                )}

                {m.ejecutivos && (
                  <Route path="/ejecutivos" component={Executives} />
                )}

                {m.reportes_egresos && (
                  <Route path="/reportes/egresos" component={ExpenseReport} />
                )}

                {m.reportes_visitas && (
                  <Route path="/reportes/visitas" component={ReportVisits} />
                )}

                {m.reportes_tickets && (
                  <Route path="/reportes/tickets" component={ReportTickets} />
                )}

                {m.reportes_financiero && (
                  <Route path="/reportes/financiero" component={ReportFinancial} />
                )}

                {m.reportes_equipos && (
                  <Route path="/reportes/equipos" component={ReportEquipment} />
                )}

                {m.reportes_ejecutivos && (
                  <Route path="/reportes/ejecutivos" component={ReportExecutives} />
                )}

                {m.estado_documental && (
                  <Route path="/reportes/cumplimiento" component={RegulatoryComplianceReport} />
                )}
                
                {m.admin_usuarios && (
                  <Route path="/admin/usuarios" component={AdminUsers} />
                )}
                
                {m.panel_super_admin && <Route path="/super-admin" component={SuperAdminPanel} />}
                {(m.panel_super_admin || m.admin_usuarios) && <Route path="/gestion-permisos" component={GestionPermisos} />}
                
                <Route path="/chat-ia" component={ChatIA} />
                {m.monitoreo_chat_ia && <Route path="/monitoreo-chat" component={MonitoreoChat} />}

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
    if (location === "/login") {
      return <Login />;
    }
    if (location === "/dev-login") {
      return <DevLogin />;
    }
    return <Landing />;
  }

  if (location === "/change-password") {
    return <ChangePassword />;
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
