import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowDownUp, MapPin, Clock, Users, BellPlus, Zap, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Users2 } from "lucide-react";
import { z } from "zod";
import { AppLayout, RouteBadge } from "../components/AppLayout";
import { findRoutes, isPeakNow } from "../lib/data";

// ─── Insights types & fetch ───────────────────────────────────────────────────

type Insights = {
  traffic_level: 'low' | 'moderate' | 'heavy' | 'severe';
  congestion_score: number;
  current_fare_type: 'peak' | 'off_peak' | 'weekend';
  predicted_fare_change: 'rising' | 'stable' | 'falling';
  predicted_fare_in_30min: number;
  suggested_departure: string;
  alternative_message: string | null;
  commuter_reports_last_hour: number;
  last_fare_confirmation: string | null;
};

function useInsights(from: string, to: string) {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!from || !to) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/routes/insights?origin=${encodeURIComponent(from)}&dest=${encodeURIComponent(to)}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [from, to]);

  return { data, loading };
}

// ─── Smart Insights card ──────────────────────────────────────────────────────

const TRAFFIC_BORDER: Record<string, string> = {
  low:      'border-l-emerald-500',
  moderate: 'border-l-yellow-400',
  heavy:    'border-l-orange-500',
  severe:   'border-l-red-600',
};
const TRAFFIC_BG: Record<string, string> = {
  low:      'bg-emerald-50',
  moderate: 'bg-yellow-50',
  heavy:    'bg-orange-50',
  severe:   'bg-red-50',
};
const TRAFFIC_BADGE: Record<string, string> = {
  low:      'bg-emerald-100 text-emerald-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  heavy:    'bg-orange-100 text-orange-800',
  severe:   'bg-red-100 text-red-800',
};
const TRAFFIC_BAR: Record<string, string> = {
  low:      'bg-emerald-500',
  moderate: 'bg-yellow-400',
  heavy:    'bg-orange-500',
  severe:   'bg-red-600',
};

function InsightsCard({ data, loading }: { data: Insights | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-white border border-l-4 border-l-muted rounded-2xl p-4 shadow-sm animate-pulse">
        <div className="h-4 bg-muted rounded w-32 mb-3" />
        <div className="h-3 bg-muted rounded w-full mb-2" />
        <div className="h-3 bg-muted rounded w-3/4" />
      </div>
    );
  }
  if (!data) return null;

  const { traffic_level, congestion_score, predicted_fare_change, predicted_fare_in_30min,
          suggested_departure, alternative_message, commuter_reports_last_hour,
          last_fare_confirmation } = data;

  const FareArrow = predicted_fare_change === 'rising'
    ? TrendingUp
    : predicted_fare_change === 'falling'
    ? TrendingDown
    : Minus;

  const fareArrowColor = predicted_fare_change === 'rising'
    ? 'text-red-600'
    : predicted_fare_change === 'falling'
    ? 'text-emerald-600'
    : 'text-muted-foreground';

  return (
    <div className={`border border-l-4 ${TRAFFIC_BORDER[traffic_level]} ${TRAFFIC_BG[traffic_level]} rounded-2xl p-4 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground/70">
            Live Intelligence
          </span>
        </div>
        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${TRAFFIC_BADGE[traffic_level]}`}>
          {traffic_level} traffic
        </span>
      </div>

      {/* Fare prediction banner */}
      {predicted_fare_change === 'rising' && (
        <div className="flex items-center gap-2 bg-red-100 border border-red-200 rounded-xl px-3 py-2 mb-3 text-sm font-semibold text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Fare surge likely in 30 mins — board now
        </div>
      )}
      {predicted_fare_change === 'falling' && (
        <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-200 rounded-xl px-3 py-2 mb-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Fares dropping soon — consider waiting
        </div>
      )}

      {/* Main stats row */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Congestion score */}
        <div className="bg-white/70 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
            Congestion
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${TRAFFIC_BAR[traffic_level]}`}
                style={{ width: `${congestion_score * 10}%` }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums">{congestion_score}/10</span>
          </div>
        </div>

        {/* Fare in 30 min */}
        <div className="bg-white/70 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
            Fare in 30 min
          </div>
          <div className="flex items-center gap-1.5">
            <FareArrow className={`w-4 h-4 shrink-0 ${fareArrowColor}`} />
            <span className="font-extrabold text-sm">KES {predicted_fare_in_30min}</span>
          </div>
        </div>
      </div>

      {/* Suggested departure */}
      <div className="flex items-start gap-2 text-sm text-foreground/80 mb-2">
        <Zap className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
        <span className="font-medium">{suggested_departure}</span>
      </div>

      {/* Alt route */}
      {alternative_message && (
        <div className="text-xs text-muted-foreground flex items-start gap-1.5 mb-2">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
          {alternative_message}
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center gap-3 pt-2 border-t border-black/5 text-xs text-muted-foreground">
        {commuter_reports_last_hour > 0 && (
          <span className="flex items-center gap-1">
            <Users2 className="w-3.5 h-3.5" />
            {commuter_reports_last_hour} report{commuter_reports_last_hour !== 1 ? 's' : ''} last hr
          </span>
        )}
        {last_fare_confirmation && (
          <span className="flex items-center gap-1 ml-auto">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {last_fare_confirmation}
          </span>
        )}
      </div>
    </div>
  );
}

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
  const { data: insights, loading: insightsLoading } = useInsights(from, to);

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
        {/* Smart Insights */}
        <div className="mb-4">
          <InsightsCard data={insights} loading={insightsLoading} />
        </div>

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
