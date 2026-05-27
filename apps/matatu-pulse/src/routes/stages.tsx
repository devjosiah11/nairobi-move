import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { AppLayout, RouteBadge } from "../components/AppLayout";
import { STAGES, ROUTES } from "../lib/data";

export const Route = createFileRoute("/stages")({
  component: Stages,
});

function Stages() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return STAGES;
    return STAGES.filter((s) => s.name.toLowerCase().includes(term));
  }, [q]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof STAGES>();
    for (const s of filtered) {
      const letter = s.name[0].toUpperCase();
      if (!m.has(letter)) m.set(letter, []);
      m.get(letter)!.push(s);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <AppLayout>
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="text-xs uppercase tracking-wider text-white/70">
            Directory
          </div>
          <h1 className="text-2xl font-extrabold">All Nairobi stages</h1>
          <p className="text-white/85 text-sm mt-1">
            Find any stage and see which matatus pass through.
          </p>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search stage e.g. Westlands"
              className="w-full h-12 pl-10 pr-3 rounded-xl bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary text-sm font-medium"
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-6">
        {grouped.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No stages found.
          </div>
        )}
        {grouped.map(([letter, stages]) => (
          <section key={letter}>
            <div className="text-xs font-extrabold text-primary mb-2 px-1">
              {letter}
            </div>
            <ul className="space-y-2">
              {stages.map((s) => {
                const routes = ROUTES.filter((r) => s.routeIds.includes(r.id));
                return (
                  <li key={s.name}>
                    <Link
                      to="/results"
                      search={{ from: s.name, to: "CBD" }}
                      className="block bg-white border rounded-2xl p-4 hover:border-primary transition shadow-sm"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold">{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.area} · {routes.length}{" "}
                            {routes.length === 1 ? "route" : "routes"} passing
                            through
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {routes.slice(0, 6).map((r) => (
                              <RouteBadge
                                key={r.id}
                                number={r.number}
                                color={r.badgeColor}
                                size="sm"
                              />
                            ))}
                            {routes.length > 6 && (
                              <span className="text-xs text-muted-foreground self-center">
                                +{routes.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </AppLayout>
  );
}
