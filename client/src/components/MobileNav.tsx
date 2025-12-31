import { Link, useLocation } from "wouter";
import { Calendar, Ticket, Building2, User } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

const navItems = [
  { path: "/visitas", label: "Visitas", icon: Calendar },
  { path: "/tickets", label: "Tickets", icon: Ticket },
  { path: "/edificios", label: "Edificios", icon: Building2 },
  { path: "/perfil", label: "Perfil", icon: User },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.startsWith(item.path);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <div
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
        <div className="flex flex-col items-center justify-center py-2 px-3">
          <NotificationBell />
        </div>
      </div>
    </nav>
  );
}
