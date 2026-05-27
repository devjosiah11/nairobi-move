import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, RouteBadge } from "../components/AppLayout";
import { ROUTES } from "../lib/data";
import { ChevronRight, Clock, Users } from "lucide-react";

export const Route = createFileRoute("/routes")({
  component: RoutesList,
});

function RoutesList() {
  return (
    <AppLayout>
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="text-xs uppercase tracking-wider text-white/70">
            Browse
          </div>
          <h1 className="text-2xl font-extrabold">All matatu routes</h1>
          <p className="text-white/85 text-sm mt-1">
            {ROUTES.length} active routes across Nairobi.
          </p>
        </div>
      </div>
      <ul className="max-w-3xl mx-auto px-4 py-5 space-y-2">
        {ROUTES.map((r) => (
          <li key={r.id}>
            <Link
              to="/route/$id"
              params={{ id: r.id }}
              className="flex items-center gap-3 bg-white border rounded-2xl p-3 hover:border-primary transition shadow-sm"
            >
              <RouteBadge number={r.number} color={r.badgeColor} />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">
                  {r.from} → {r.to}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.sacco}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {r.journeyMinutes}m
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" /> {r.vehicle}
                  </span>
                  <span className="font-bold text-primary">
                    KES {r.fareOffPeak[0]}–{r.farePeak[1]}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </AppLayout>
  );
}
