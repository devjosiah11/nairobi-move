import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, ListOrdered, Map, ShieldAlert, Users } from "lucide-react";
import { riders } from "@/lib/dispatch-data";

const nav = [
  { to: "/", label: "Live Board", icon: LayoutGrid },
  { to: "/trips", label: "Trip Log", icon: ListOrdered },
  { to: "/sos", label: "SOS Alerts", icon: ShieldAlert },
  { to: "/stages", label: "Stage Leaderboard", icon: Map },
  { to: "/riders", label: "All Riders", icon: Users },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const available = riders.filter((r) => r.status === "available").length;
  const ontrip = riders.filter((r) => r.status === "ontrip").length;
  const offline = riders.filter((r) => r.status === "offline").length;
  const sos = riders.filter((r) => r.status === "sos").length;

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary grid place-items-center text-primary-foreground font-bold">
            BD
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-[15px]">BodaDispatch</div>
            <div className="text-[11px] text-sidebar-foreground/60">by NairobiMove</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border space-y-2.5">
        <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold mb-1">
          Live Stats
        </div>
        <StatRow label="Available" value={available} color="bg-status-available" pulse />
        <StatRow label="On Trip" value={ontrip} color="bg-status-ontrip" />
        <StatRow label="Offline" value={offline} color="bg-status-offline" />
        <StatRow label="SOS Active" value={sos} color="bg-status-sos" sos />
      </div>
    </aside>
  );
}

function StatRow({
  label,
  value,
  color,
  pulse,
  sos,
}: {
  label: string;
  value: number;
  color: string;
  pulse?: boolean;
  sos?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2.5">
        <span
          className={`h-2.5 w-2.5 rounded-full ${color} ${
            pulse ? "animate-pulse-dot" : ""
          } ${sos && value > 0 ? "animate-pulse-dot" : ""}`}
        />
        <span className="text-sidebar-foreground/80">{label}</span>
      </div>
      <span
        className={`text-sm font-semibold tabular-nums ${
          sos && value > 0 ? "text-status-sos" : "text-sidebar-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
