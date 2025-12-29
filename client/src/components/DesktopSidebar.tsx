import { Link, useLocation } from "wouter";
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
  Ticket,
  Building2,
  Wrench,
  Users,
  LogOut,
  HardHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";
import type { User } from "@shared/models/auth";
import type { UserRole } from "@shared/schema";

interface DesktopSidebarProps {
  user: User;
  userRole: UserRole;
  onLogout: () => void;
}

const managerNavItems = [
  { 
    group: "Dashboards",
    items: [
      { path: "/dashboard/tickets", label: "Tickets Semaforo", icon: Ticket },
      { path: "/dashboard/visitas", label: "Panel Visitas", icon: Calendar },
    ]
  },
  {
    group: "Gestion",
    items: [
      { path: "/edificios", label: "Edificios", icon: Building2 },
      { path: "/equipos", label: "Equipos Criticos", icon: Wrench },
      { path: "/mantenedores", label: "Mantenedores", icon: HardHat },
      { path: "/ejecutivos", label: "Ejecutivos", icon: Users },
    ]
  },
];

const executiveNavItems = [
  {
    group: "Mi Trabajo",
    items: [
      { path: "/visitas", label: "Agenda de Visitas", icon: Calendar },
      { path: "/tickets", label: "Mis Tickets", icon: Ticket },
    ]
  },
  {
    group: "Consulta",
    items: [
      { path: "/edificios", label: "Edificios", icon: Building2 },
      { path: "/equipos", label: "Equipos Criticos", icon: Wrench },
    ]
  },
];

const generalManagerNavItems = [
  { 
    group: "Dashboards",
    items: [
      { path: "/dashboard/overview", label: "Panel General", icon: LayoutDashboard },
      { path: "/dashboard/tickets", label: "Tickets Semaforo", icon: Ticket },
      { path: "/dashboard/visitas", label: "Panel Visitas", icon: Calendar },
    ]
  },
  {
    group: "Gestion",
    items: [
      { path: "/edificios", label: "Edificios", icon: Building2 },
      { path: "/equipos", label: "Equipos Criticos", icon: Wrench },
      { path: "/mantenedores", label: "Mantenedores", icon: HardHat },
      { path: "/ejecutivos", label: "Ejecutivos", icon: Users },
    ]
  },
];

const financeNavItems = [
  { 
    group: "Dashboards",
    items: [
      { path: "/dashboard/tickets", label: "Tickets Semaforo", icon: Ticket },
    ]
  },
];

export function DesktopSidebar({ user, userRole, onLogout }: DesktopSidebarProps) {
  const [location] = useLocation();
  
  const getNavItems = () => {
    switch (userRole) {
      case "gerente_general":
        return generalManagerNavItems;
      case "gerente_operaciones":
        return managerNavItems;
      case "gerente_finanzas":
        return financeNavItems;
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
      gerente_general: "Gerente General",
      gerente_operaciones: "Gerente Operaciones",
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
                  const isActive = location.startsWith(item.path);
                  const Icon = item.icon;
                  
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        data-testid={`sidebar-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        <Link href={item.path}>
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
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
