import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, LayoutDashboard, MessageSquare, PlusCircle, FileBarChart } from "lucide-react";
import { vehicles, vehicleStatus } from "@/lib/fleet-data";
import { cn } from "@/lib/utils";

const nav: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/", label: "Fleet Overview", icon: LayoutDashboard, exact: true },
  { to: "/add-vehicle", label: "Add Vehicle", icon: PlusCircle },
  { to: "/sms", label: "SMS Log", icon: MessageSquare },
  { to: "/report", label: "Compliance Report", icon: FileBarChart },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const total = vehicles.length;
  const compliant = vehicles.filter((v) => vehicleStatus(v) === "Compliant").length;
  const expiring = vehicles.filter((v) => vehicleStatus(v) === "Expiring").length;
  const overdue = vehicles.filter((v) => vehicleStatus(v) === "Overdue").length;

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-navy text-navy-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">FleetPulse</div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">
            by NairobiMove
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as string}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-4 rounded-lg bg-white/5 p-4 border border-white/5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-3">
          Fleet Health
        </div>
        <div className="space-y-2.5 text-sm">
          <Row label="Total vehicles" value={total} dot="bg-white/40" />
          <Row label="Compliant" value={compliant} dot="bg-success" />
          <Row label="Expiring soon" value={expiring} dot="bg-primary" />
          <Row label="Overdue" value={overdue} dot="bg-destructive" />
        </div>
      </div>
    </aside>
  );
}

function Row({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-white/70">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        {label}
      </div>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
