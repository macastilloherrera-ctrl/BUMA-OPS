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
  ClipboardCheck,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";
import type { User } from "@shared/models/auth";
import type { UserRole, Ticket as TicketType } from "@shared/schema";
import type { UserPermissions } from "@/hooks/use-permissions";
import type { ModuleKey } from "@shared/modulePermissions";
import { ROLE_LABELS } from "@shared/modulePermissions";
import type { LucideIcon } from "lucide-react";

interface DesktopSidebarProps {
  user: User;
  userRole: UserRole;
  onLogout: () => void;
  permissions: UserPermissions;
}

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  moduleKey?: ModuleKey;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const allNavGroups: NavGroup[] = [
  {
    group: "Panel Super Admin",
    items: [
      { path: "/super-admin", label: "Panel Super Admin", icon: Shield, moduleKey: "panel_super_admin" },
      { path: "/gestion-permisos", label: "Gestión de Permisos", icon: Shield, moduleKey: "panel_super_admin" },
    ]
  },
  {
    group: "Dashboards",
    items: [
      { path: "/dashboard/overview", label: "Panel General", icon: LayoutDashboard, moduleKey: "dashboard_overview" },
      { path: "/dashboard/tickets", label: "Tickets Semáforo", icon: Ticket, moduleKey: "dashboard_tickets" },
      { path: "/dashboard/visitas", label: "Panel Visitas", icon: Calendar, moduleKey: "dashboard_visitas" },
      { path: "/calendario", label: "Calendario", icon: CalendarDays, moduleKey: "calendario" },
    ]
  },
  {
    group: "Operaciones",
    items: [
      { path: "/tickets", label: "Todos los Tickets", icon: Ticket, moduleKey: "tickets" },
      { path: "/tickets?mine=true", label: "Mis Tickets", icon: ClipboardList, moduleKey: "tickets" },
      { path: "/visitas", label: "Visitas", icon: Calendar, moduleKey: "visitas" },
      { path: "/consulta-operacional", label: "Consulta Operacional", icon: BarChart3, moduleKey: "consulta_operacional" },
    ]
  },
  {
    group: "Mi Edificio",
    items: [
      { path: "/tickets", label: "Tickets Asignados", icon: Ticket, moduleKey: "tickets" },
      { path: "/egresos", label: "Cuentas / Egresos", icon: ArrowUpCircle, moduleKey: "egresos" },
    ]
  },
  {
    group: "Proyectos",
    items: [
      { path: "/proyectos/semaforo", label: "Proyectos Semáforo", icon: FolderKanban, moduleKey: "proyectos" },
      { path: "/proyectos", label: "Panel Proyectos", icon: ClipboardList, moduleKey: "proyectos" },
      { path: "/proyectos/calendario", label: "Calendario Proyectos", icon: CalendarDays, moduleKey: "proyectos" },
    ]
  },
  {
    group: "Finanzas",
    items: [
      { path: "/cierre-mensual", label: "Cierre Mensual", icon: FileCheck, moduleKey: "cierre_mensual" },
      { path: "/conciliacion-bancaria", label: "Conciliación Bancaria", icon: Landmark, moduleKey: "conciliacion_bancaria" },
      { path: "/verificacion-ggcc", label: "Verificación GGCC", icon: ClipboardCheck, moduleKey: "verificacion_ggcc" },
      { path: "/historial-pagos", label: "Historial de Pagos", icon: History, moduleKey: "historial_pagos" },
      { path: "/ingresos", label: "Ingresos", icon: ArrowDownCircle, moduleKey: "ingresos" },
      { path: "/egresos", label: "Egresos", icon: ArrowUpCircle, moduleKey: "egresos" },
      { path: "/consumos-recurrentes", label: "Consumos Recurrentes", icon: Repeat, moduleKey: "consumos_recurrentes" },
    ]
  },
  {
    group: "Gestión",
    items: [
      { path: "/edificios", label: "Edificios", icon: Building2, moduleKey: "edificios" },
      { path: "/equipos", label: "Equipos Críticos", icon: Wrench, moduleKey: "equipos_criticos" },
      { path: "/mantenedores", label: "Proveedores", icon: HardHat, moduleKey: "mantenedores" },
      { path: "/ejecutivos", label: "Ejecutivos", icon: Users, moduleKey: "ejecutivos" },
    ]
  },
  {
    group: "Reportes",
    items: [
      { path: "/reportes/visitas", label: "Informe Visitas", icon: Calendar, moduleKey: "reportes_visitas" },
      { path: "/reportes/tickets", label: "Informe Tickets", icon: Ticket, moduleKey: "reportes_tickets" },
      { path: "/reportes/financiero", label: "Informe Financiero", icon: DollarSign, moduleKey: "reportes_financiero" },
      { path: "/reportes/equipos", label: "Informe Equipos", icon: Wrench, moduleKey: "reportes_equipos" },
      { path: "/reportes/ejecutivos", label: "Informe Ejecutivos", icon: Users, moduleKey: "reportes_ejecutivos" },
      { path: "/reportes/egresos", label: "Informe Egresos", icon: FileSpreadsheet, moduleKey: "reportes_egresos" },
      { path: "/reportes/cumplimiento", label: "Estado Documental y Operativo", icon: FileCheck, moduleKey: "estado_documental" },
    ]
  },
  {
    group: "Administración",
    items: [
      { path: "/admin/usuarios", label: "Usuarios", icon: Shield, moduleKey: "admin_usuarios" },
      { path: "/gestion-permisos", label: "Gestión de Permisos", icon: Shield, moduleKey: "admin_usuarios" },
    ]
  },
  {
    group: "Herramientas",
    items: [
      { path: "/chat-ia", label: "Asistente IA", icon: Bot },
    ]
  },
];

function getFilteredNavGroups(modules: Record<ModuleKey, boolean>, userRole: UserRole): NavGroup[] {
  const isConserjeria = userRole === "conserjeria";

  const result: NavGroup[] = [];

  for (const group of allNavGroups) {
    if (group.group === "Panel Super Admin" && !modules.panel_super_admin) continue;
    if (group.group === "Administración" && !modules.admin_usuarios) continue;
    if (group.group === "Mi Edificio" && !isConserjeria) continue;
    if (isConserjeria && group.group !== "Mi Edificio") continue;

    if (group.group === "Administración" && modules.panel_super_admin) continue;

    const filteredItems = group.items.filter((item) => {
      if (!item.moduleKey) return true;
      return !!modules[item.moduleKey];
    });

    if (filteredItems.length > 0) {
      result.push({ group: group.group, items: filteredItems });
    }
  }

  return result;
}

export function DesktopSidebar({ user, userRole, onLogout, permissions }: DesktopSidebarProps) {
  const [location] = useLocation();
  
  const isManager = ["gerente_general", "gerente_operaciones", "gerente_comercial"].includes(userRole);
  
  const { data: delegatedTickets } = useQuery<TicketType[]>({
    queryKey: ["/api/tickets/delegated-to-me"],
    enabled: isManager,
    staleTime: 30000,
  });
  
  const delegatedCount = delegatedTickets?.length || 0;
  
  const navItems = getFilteredNavGroups(permissions.modules, userRole);

  const getInitials = () => {
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  const getRoleLabel = () => {
    return ROLE_LABELS[userRole] || userRole;
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
