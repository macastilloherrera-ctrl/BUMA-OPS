import { Link, useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Ticket,
  Building2,
  Wrench,
  Users,
  LogOut,
  HardHat,
  ClipboardList,
  FileSpreadsheet,
  FileCheck,
  DollarSign,
  BarChart3,
  Shield,
  FolderKanban,
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
  Landmark,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";
import type { User } from "@shared/models/auth";
import type { UserRole, Ticket as TicketType } from "@shared/schema";

interface DesktopSidebarProps {
  user: User;
  userRole: UserRole;
  onLogout: () => void;
}

const managerNavItems = [
  { 
    group: "Dashboards",
    items: [
      { path: "/dashboard/tickets", label: "Tickets Semáforo", icon: Ticket },
      { path: "/dashboard/visitas", label: "Panel Visitas", icon: Calendar },
      { path: "/calendario", label: "Calendario", icon: CalendarDays },
    ]
  },
  {
    group: "Operaciones",
    items: [
      { path: "/tickets", label: "Todos los Tickets", icon: Ticket },
      { path: "/tickets?mine=true", label: "Mis Tickets", icon: ClipboardList },
      { path: "/visitas", label: "Visitas", icon: Calendar },
      { path: "/consulta-operacional", label: "Consulta Operacional", icon: BarChart3 },
    ]
  },
  {
    group: "Proyectos",
    items: [
      { path: "/proyectos/semaforo", label: "Proyectos Semáforo", icon: FolderKanban },
      { path: "/proyectos", label: "Panel Proyectos", icon: ClipboardList },
      { path: "/proyectos/calendario", label: "Calendario Proyectos", icon: CalendarDays },
    ]
  },
  {
    group: "Gestión",
    items: [
      { path: "/edificios", label: "Edificios", icon: Building2 },
      { path: "/equipos", label: "Equipos Críticos", icon: Wrench },
      { path: "/mantenedores", label: "Proveedores", icon: HardHat },
      { path: "/ejecutivos", label: "Ejecutivos", icon: Users },
    ]
  },
  {
    group: "Reportes",
    items: [
      { path: "/reportes/visitas", label: "Informe Visitas", icon: Calendar },
      { path: "/reportes/tickets", label: "Informe Tickets", icon: Ticket },
      { path: "/reportes/equipos", label: "Informe Equipos", icon: Wrench },
      { path: "/reportes/ejecutivos", label: "Informe Ejecutivos", icon: Users },
      { path: "/reportes/cumplimiento", label: "Estado Documental y Operativo", icon: FileCheck },
    ]
  },
];

const managerWithReportsNavItems = [
  { 
    group: "Dashboards",
    items: [
      { path: "/dashboard/tickets", label: "Tickets Semáforo", icon: Ticket },
      { path: "/dashboard/visitas", label: "Panel Visitas", icon: Calendar },
      { path: "/calendario", label: "Calendario", icon: CalendarDays },
    ]
  },
  {
    group: "Operaciones",
    items: [
      { path: "/tickets", label: "Todos los Tickets", icon: Ticket },
      { path: "/tickets?mine=true", label: "Mis Tickets", icon: ClipboardList },
      { path: "/visitas", label: "Visitas", icon: Calendar },
    ]
  },
  {
    group: "Proyectos",
    items: [
      { path: "/proyectos/semaforo", label: "Proyectos Semáforo", icon: FolderKanban },
      { path: "/proyectos", label: "Panel Proyectos", icon: ClipboardList },
      { path: "/proyectos/calendario", label: "Calendario Proyectos", icon: CalendarDays },
    ]
  },
  {
    group: "Finanzas",
    items: [
      { path: "/cierre-mensual", label: "Cierre Mensual", icon: FileCheck },
      { path: "/conciliacion-bancaria", label: "Conciliación Bancaria", icon: Landmark },
      { path: "/historial-pagos", label: "Historial de Pagos", icon: History },
      { path: "/ingresos", label: "Ingresos", icon: ArrowDownCircle },
      { path: "/egresos", label: "Egresos", icon: ArrowUpCircle },
      { path: "/consumos-recurrentes", label: "Consumos Recurrentes", icon: Repeat },
    ]
  },
  {
    group: "Gestión",
    items: [
      { path: "/edificios", label: "Edificios", icon: Building2 },
      { path: "/equipos", label: "Equipos Críticos", icon: Wrench },
      { path: "/mantenedores", label: "Proveedores", icon: HardHat },
      { path: "/ejecutivos", label: "Ejecutivos", icon: Users },
    ]
  },
  {
    group: "Reportes",
    items: [
      { path: "/reportes/visitas", label: "Informe Visitas", icon: Calendar },
      { path: "/reportes/tickets", label: "Informe Tickets", icon: Ticket },
      { path: "/reportes/financiero", label: "Informe Financiero", icon: DollarSign },
      { path: "/reportes/equipos", label: "Informe Equipos", icon: Wrench },
      { path: "/reportes/ejecutivos", label: "Informe Ejecutivos", icon: Users },
      { path: "/reportes/egresos", label: "Informe Egresos", icon: FileSpreadsheet },
      { path: "/reportes/cumplimiento", label: "Estado Documental y Operativo", icon: FileCheck },
    ]
  },
];

const executiveNavItems = [
  {
    group: "Mi Trabajo",
    items: [
      { path: "/visitas", label: "Agenda de Visitas", icon: Calendar },
      { path: "/tickets", label: "Mis Tickets", icon: Ticket },
      { path: "/calendario", label: "Calendario", icon: CalendarDays },
      { path: "/consulta-operacional", label: "Consulta Operacional", icon: BarChart3 },
    ]
  },
  {
    group: "Proyectos",
    items: [
      { path: "/proyectos/semaforo", label: "Proyectos Semáforo", icon: FolderKanban },
      { path: "/proyectos", label: "Panel Proyectos", icon: ClipboardList },
      { path: "/proyectos/calendario", label: "Calendario Proyectos", icon: CalendarDays },
    ]
  },
  {
    group: "Pagos",
    items: [
      { path: "/historial-pagos", label: "Historial de Pagos", icon: History },
    ]
  },
  {
    group: "Consulta",
    items: [
      { path: "/edificios", label: "Edificios", icon: Building2 },
      { path: "/equipos", label: "Equipos Críticos", icon: Wrench },
    ]
  },
  {
    group: "Reportes",
    items: [
      { path: "/reportes/cumplimiento", label: "Estado Documental y Operativo", icon: FileCheck },
    ]
  },
];

const generalManagerNavItems = [
  { 
    group: "Dashboards",
    items: [
      { path: "/dashboard/overview", label: "Panel General", icon: LayoutDashboard },
      { path: "/dashboard/tickets", label: "Tickets Semáforo", icon: Ticket },
      { path: "/dashboard/visitas", label: "Panel Visitas", icon: Calendar },
      { path: "/calendario", label: "Calendario", icon: CalendarDays },
    ]
  },
  {
    group: "Operaciones",
    items: [
      { path: "/tickets", label: "Todos los Tickets", icon: Ticket },
      { path: "/tickets?mine=true", label: "Mis Tickets", icon: ClipboardList },
      { path: "/visitas", label: "Visitas", icon: Calendar },
    ]
  },
  {
    group: "Proyectos",
    items: [
      { path: "/proyectos/semaforo", label: "Proyectos Semáforo", icon: FolderKanban },
      { path: "/proyectos", label: "Panel Proyectos", icon: ClipboardList },
      { path: "/proyectos/calendario", label: "Calendario Proyectos", icon: CalendarDays },
    ]
  },
  {
    group: "Finanzas",
    items: [
      { path: "/cierre-mensual", label: "Cierre Mensual", icon: FileCheck },
      { path: "/conciliacion-bancaria", label: "Conciliación Bancaria", icon: Landmark },
      { path: "/historial-pagos", label: "Historial de Pagos", icon: History },
      { path: "/ingresos", label: "Ingresos", icon: ArrowDownCircle },
      { path: "/egresos", label: "Egresos", icon: ArrowUpCircle },
      { path: "/consumos-recurrentes", label: "Consumos Recurrentes", icon: Repeat },
    ]
  },
  {
    group: "Gestión",
    items: [
      { path: "/edificios", label: "Edificios", icon: Building2 },
      { path: "/equipos", label: "Equipos Críticos", icon: Wrench },
      { path: "/mantenedores", label: "Proveedores", icon: HardHat },
      { path: "/ejecutivos", label: "Ejecutivos", icon: Users },
    ]
  },
  {
    group: "Reportes",
    items: [
      { path: "/reportes/visitas", label: "Informe Visitas", icon: Calendar },
      { path: "/reportes/tickets", label: "Informe Tickets", icon: Ticket },
      { path: "/reportes/financiero", label: "Informe Financiero", icon: DollarSign },
      { path: "/reportes/equipos", label: "Informe Equipos", icon: Wrench },
      { path: "/reportes/ejecutivos", label: "Informe Ejecutivos", icon: Users },
      { path: "/reportes/egresos", label: "Informe Egresos", icon: FileSpreadsheet },
      { path: "/reportes/cumplimiento", label: "Estado Documental y Operativo", icon: FileCheck },
    ]
  },
  {
    group: "Administración",
    items: [
      { path: "/admin/usuarios", label: "Usuarios", icon: Shield },
    ]
  },
];

const financeNavItems = [
  { 
    group: "Dashboards",
    items: [
      { path: "/dashboard/tickets", label: "Tickets Semáforo", icon: Ticket },
    ]
  },
  {
    group: "Finanzas",
    items: [
      { path: "/cierre-mensual", label: "Cierre Mensual", icon: FileCheck },
      { path: "/conciliacion-bancaria", label: "Conciliación Bancaria", icon: Landmark },
      { path: "/historial-pagos", label: "Historial de Pagos", icon: History },
      { path: "/ingresos", label: "Ingresos", icon: ArrowDownCircle },
      { path: "/egresos", label: "Egresos", icon: ArrowUpCircle },
      { path: "/consumos-recurrentes", label: "Consumos Recurrentes", icon: Repeat },
    ]
  },
  {
    group: "Reportes",
    items: [
      { path: "/reportes/cumplimiento", label: "Estado Documental y Operativo", icon: FileCheck },
      { path: "/reportes/egresos", label: "Informe Egresos", icon: FileSpreadsheet },
    ]
  },
];

const conserjeriaNavItems = [
  {
    group: "Mi Edificio",
    items: [
      { path: "/tickets", label: "Tickets Asignados", icon: Ticket },
      { path: "/egresos", label: "Cuentas / Egresos", icon: ArrowUpCircle },
    ]
  },
];

const superAdminNavItems = [
  {
    group: "Panel Super Admin",
    items: [
      { path: "/super-admin", label: "Panel Super Admin", icon: Shield },
    ]
  },
];

export function DesktopSidebar({ user, userRole, onLogout }: DesktopSidebarProps) {
  const [location] = useLocation();
  
  // Fetch delegated tickets count for managers
  const isManager = ["gerente_general", "gerente_operaciones", "gerente_comercial"].includes(userRole);
  
  const { data: delegatedTickets } = useQuery<TicketType[]>({
    queryKey: ["/api/tickets/delegated-to-me"],
    enabled: isManager,
    staleTime: 30000,
  });
  
  const delegatedCount = delegatedTickets?.length || 0;
  
  const getNavItems = () => {
    switch (userRole) {
      case "super_admin":
        return superAdminNavItems;
      case "gerente_general":
        return generalManagerNavItems;
      case "gerente_comercial":
        return managerWithReportsNavItems;
      case "gerente_operaciones":
        return managerNavItems;
      case "gerente_finanzas":
        return financeNavItems;
      case "conserjeria":
        return conserjeriaNavItems;
      default:
        return executiveNavItems;
    }
  };
  
  const navItems = getNavItems();

  const getInitials = () => {
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  const getRoleLabel = () => {
    const labels: Record<UserRole, string> = {
      super_admin: "Super Admin",
      gerente_general: "Gerente General",
      gerente_operaciones: "Gerente Operaciones",
      gerente_comercial: "Gerente Comercial",
      gerente_finanzas: "Gerente Finanzas",
      ejecutivo_operaciones: "Ejecutivo Operaciones",
    };
    return labels[userRole];
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Logo size="lg" />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {navItems.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel className="text-xs uppercase tracking-wide">
              {group.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const pathBase = item.path.split("?")[0];
                  const isActive = location.startsWith(pathBase);
                  const Icon = item.icon;
                  const isMisTickets = item.path === "/tickets?mine=true";
                  const showDelegatedBadge = isMisTickets && delegatedCount > 0;
                  const hasQueryString = item.path.includes("?");
                  
                  const handleClick = () => {
                    if (hasQueryString) {
                      window.location.href = item.path;
                    }
                  };
                  
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild={!hasQueryString}
                        isActive={isActive}
                        className={showDelegatedBadge ? "bg-violet-500/10" : ""}
                        data-testid={`sidebar-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                        onClick={hasQueryString ? handleClick : undefined}
                      >
                        {hasQueryString ? (
                          <div className="flex items-center gap-2 w-full cursor-pointer">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {showDelegatedBadge && (
                              <Badge 
                                className="bg-violet-500 text-white text-xs px-1.5 py-0 h-5 min-w-[1.25rem] flex items-center justify-center shrink-0"
                                data-testid="badge-delegated-count"
                              >
                                {delegatedCount}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Link href={item.path} className="flex items-center gap-2 w-full">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{item.label}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {getRoleLabel()}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={onLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesion
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
