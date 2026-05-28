import { Link, useLocation } from "@tanstack/react-router";
import { Search, Map, MapPin, Bell, Navigation2 } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/",       label: "Search",   icon: Search      },
  { to: "/routes", label: "Routes",   icon: Map         },
  { to: "/map",    label: "Live Map", icon: Navigation2 },
  { to: "/stages", label: "Stages",   icon: MapPin      },
  { to: "/alerts", label: "Alerts",   icon: Bell        },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top nav (desktop) + brand bar (mobile) */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b">
        <div className="matatu-stripe h-1.5 w-full" />
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="inline-flex items-center justify-center h-8 w-10 rounded-md bg-primary text-primary-foreground font-black tracking-tight shadow-sm">
              MP
            </span>
            <span className="font-extrabold tracking-tight text-lg">
              Matatu<span className="text-primary">Pulse</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = isActive(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-8">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-5 text-[10px]">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    active ? "bg-primary/10" : ""
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {n.label}
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}

export function RouteBadge({
  number,
  color,
  size = "md",
}: {
  number: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-7 min-w-10 text-sm px-1.5",
    md: "h-9 min-w-12 text-base px-2",
    lg: "h-12 min-w-16 text-2xl px-3",
  };
  return (
    <span
      className={`inline-flex items-center justify-center font-black text-white rounded-md tracking-tight shadow-sm ring-2 ring-white/40 ${color} ${sizes[size]}`}
    >
      {number}
    </span>
  );
}
