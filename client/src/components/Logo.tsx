import logoLight from "@assets/logotipo-azul_1766165973240.png";
import logoDark from "@assets/logotipo1-Azul_1766165949992.png";
import { useTheme } from "@/components/ThemeProvider";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", size = "md" }: LogoProps) {
  const { theme } = useTheme();
  
  const isDark = theme === "dark" || 
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  
  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12",
  };

  return (
    <img
      src={isDark ? logoDark : logoLight}
      alt="BUMA Property Management"
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
      data-testid="img-logo"
    />
  );
}

export function LogoIcon({ className = "" }: { className?: string }) {
  const { theme } = useTheme();
  
  const isDark = theme === "dark" || 
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div 
      className={`flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold ${className}`}
      data-testid="img-logo-icon"
    >
      <img
        src={isDark ? logoDark : logoLight}
        alt="BUMA"
        className="h-full w-full object-contain p-1"
      />
    </div>
  );
}
