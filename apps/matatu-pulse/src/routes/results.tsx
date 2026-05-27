import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowDownUp, MapPin, Clock, Users, BellPlus, Zap } from "lucide-react";
import { z } from "zod";
import { AppLayout, RouteBadge } from "../components/AppLayout";
import { findRoutes, isPeakNow } from "../lib/data";

const searchSchema = z.object({
  from: z.string().catch(""),
  to: z.string().catch(""),
});

export const Route = createFileRoute("/results")({
  validateSearch: searchSchema,
  component: Results,
});

type Sort = "cheapest" | "fastest" | "frequent";

function Results() {
  const { from, to } = Route.useSearch();
  const navigate = useNavigate();
  const [sort, setSort] = useState<Sort>("cheapest");
  const peak = isPeakNow();

  const routes = useMemo(() => {
    const r = findRoutes(from, to);
    const sorted = [...r];
    if (sort === "cheapest") {
      sorted.sort(
        (a, b) =>
          (peak ? a.farePeak[0] : a.fareOffPeak[0]) -
          (peak ? b.farePeak[0] : b.fareOffPeak[0]),
      );
    } else if (sort === "fastest") {
      sorted.sort((a, b) => a.journeyMinutes - b.journeyMinutes);
    } else {
      sorted.sort((a, b) => b.frequency - a.frequency);
    }
    return sorted;
  }, [from, to, sort, peak]);

  const swap = () =>
    navigate({ to: "/results", search: { from: to, to: from } });

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/"
            className="h-9 w-9 grid place-items-center rounded-full bg-white/15 hover:bg-white/25"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-white/70">
              Route results
            </div>
            <div className="text-lg font-extrabold truncate">
              {from || "—"} <span className="text-secondary">→</span> {to || "—"}
            </div>
          </div>
          <button
            onClick={swap}
            aria-label="Swap"
            className="h-9 w-9 grid place-items-center rounded-full bg-secondary text-secondary-foreground"
          >
            <ArrowDownUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Sort */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar -mx-1 px-1">
          {(
            [
              { k: "cheapest", l: "Cheapest" },
              { k: "fastest", l: "Fastest" },
              { k: "frequent", l: "Most frequent" },
            ] as { k: Sort; l: string }[]
          ).map((s) => (
            <button
              key={s.k}
              onClick={() => setSort(s.k)}
              className={`shrink-0 px-4 h-9 rounded-full text-sm font-semibold border transition ${
                sort === s.k
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-border text-foreground hover:border-primary/50"
              }`}
            >
              {s.l}
            </button>
          ))}
          <div className="ml-auto shrink-0 text-xs font-semibold text-muted-foreground">
            {routes.length} {routes.length === 1 ? "match" : "matches"}
          </div>
        </div>

        {routes.length === 0 ? (
          <div className="bg-white border rounded-2xl p-8 text-center">
            <div className="text-4xl mb-2">🚐</div>
            <div className="font-bold">No routes found</div>
            <div className="text-sm text-muted-foreground mt-1">
              Try different stage names or browse all routes.
            </div>
            <Link
              to="/routes"
              className="mt-4 inline-block px-4 h-10 leading-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm"
            >
              Browse all routes
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {routes.map((r) => {
              const fare = peak ? r.farePeak : r.fareOffPeak;
              return (
                <li key={r.id}>
                  <div className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                    <Link
                      to="/route/$id"
                      params={{ id: r.id }}
                      className="flex items-start gap-3"
                    >
                      <RouteBadge number={r.number} color={r.badgeColor} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-bold text-base truncate">{r.sacco}</div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              peak
                                ? "bg-destructive/10 text-destructive"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {peak ? (
                              <span className="inline-flex items-center gap-1">
                                <Zap className="w-3 h-3" /> Peak now
                              </span>
                            ) : (
                              "Off-peak now"
                            )}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <span className="truncate">{r.boardingStage}</span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-muted/60 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                              Peak
                            </div>
                            <div className="font-extrabold text-sm">
                              KES {r.farePeak[0]}–{r.farePeak[1]}
                            </div>
                          </div>
                          <div className="rounded-lg bg-muted/60 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                              Off-peak
                            </div>
                            <div className="font-extrabold text-sm">
                              KES {r.fareOffPeak[0]}–{r.fareOffPeak[1]}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            ~{r.journeyMinutes} min
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {r.vehicle}
                          </span>
                          <span className="font-bold text-primary">
                            Pay now: KES {fare[0]}–{fare[1]}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Link
                      to="/alerts"
                      search={{ routeId: r.id }}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-secondary/40 hover:bg-secondary/60 text-foreground font-semibold text-sm border border-amber-200"
                    >
                      <BellPlus className="w-4 h-4" />
                      Set fare alert
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
