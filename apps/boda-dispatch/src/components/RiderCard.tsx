import { Link } from "@tanstack/react-router";
import { Phone, UserCog } from "lucide-react";
import type { Rider } from "@/lib/dispatch-data";
import { initials, statusLabel } from "@/lib/dispatch-data";

const statusStyles: Record<Rider["status"], { badge: string; ring: string; avatar: string }> = {
  available: {
    badge: "bg-status-available/15 text-status-available border border-status-available/30",
    ring: "",
    avatar: "bg-status-available text-white",
  },
  ontrip: {
    badge: "bg-status-ontrip/15 text-status-ontrip border border-status-ontrip/30",
    ring: "",
    avatar: "bg-status-ontrip text-white",
  },
  offline: {
    badge: "bg-muted text-muted-foreground border border-border",
    ring: "opacity-75",
    avatar: "bg-status-offline text-white",
  },
  sos: {
    badge: "bg-status-sos text-white border border-status-sos",
    ring: "animate-sos-border",
    avatar: "bg-status-sos text-white",
  },
};

export function RiderCard({ rider }: { rider: Rider }) {
  const s = statusStyles[rider.status];
  return (
    <div
      className={`relative rounded-xl bg-card border border-border p-4 transition-shadow hover:shadow-md ${s.ring}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className={`h-12 w-12 rounded-full grid place-items-center font-semibold ${s.avatar}`}>
            {initials(rider.name)}
          </div>
          {rider.status === "available" && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-status-available ring-2 ring-card animate-pulse-dot" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-foreground truncate">{rider.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{rider.plate}</div>
            </div>
            <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full whitespace-nowrap ${s.badge}`}>
              {statusLabel(rider.status)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1.5">📍 {rider.stage}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trips today</div>
          <div className="text-base font-semibold tabular-nums">{rider.tripsToday}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Earnings</div>
          <div className="text-base font-semibold tabular-nums">KES {rider.earningsToday.toLocaleString()}</div>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground mt-2">Last active {rider.lastActivity}</div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <a
          href={`tel:${rider.phone.replace(/\s/g, "")}`}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Phone className="h-3.5 w-3.5" /> Call Rider
        </a>
        <Link
          to="/riders/$id"
          params={{ id: rider.id }}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/70 transition-colors border border-border"
        >
          <UserCog className="h-3.5 w-3.5" /> Profile
        </Link>
      </div>
    </div>
  );
}
