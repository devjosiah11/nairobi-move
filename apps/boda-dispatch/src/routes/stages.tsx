import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { riders, STAGES, trips } from "@/lib/dispatch-data";

export const Route = createFileRoute("/stages")({
  head: () => ({ meta: [{ title: "Stage Leaderboard — BodaDispatch" }] }),
  component: StagesPage,
});

function StagesPage() {
  const rows = STAGES.map((stage) => {
    const stageRiders = riders.filter((r) => r.stage === stage);
    const active = stageRiders.filter((r) => r.status === "available" || r.status === "ontrip").length;
    const tripsToday = stageRiders.reduce((acc, r) => acc + r.tripsToday, 0);
    const top = [...stageRiders].sort((a, b) => b.tripsToday - a.tripsToday)[0];
    return { stage, active, tripsToday, top, total: stageRiders.length };
  }).sort((a, b) => b.tripsToday - a.tripsToday);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" /> Stage Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Which Nairobi stage is hustling hardest today.</p>
      </header>

      <div className="rounded-xl bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/50">
            <tr>
              <th className="text-left px-5 py-3 font-medium w-16">Rank</th>
              <th className="text-left px-5 py-3 font-medium">Stage</th>
              <th className="text-right px-5 py-3 font-medium">Active riders</th>
              <th className="text-right px-5 py-3 font-medium">Trips today</th>
              <th className="text-left px-5 py-3 font-medium">Top rider</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.stage} className="border-t border-border hover:bg-muted/30">
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                    i === 0 ? "bg-primary text-primary-foreground" :
                    i === 1 ? "bg-accent text-accent-foreground" :
                    i === 2 ? "bg-secondary text-secondary-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>{i + 1}</span>
                </td>
                <td className="px-5 py-3 font-semibold">{row.stage}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span className="text-status-available font-semibold">{row.active}</span>
                  <span className="text-muted-foreground"> / {row.total}</span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold">{row.tripsToday}</td>
                <td className="px-5 py-3">
                  {row.top ? (
                    <span>{row.top.name} <span className="text-muted-foreground text-xs">· {row.top.tripsToday} trips</span></span>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">Total trips logged across all stages today: {trips.length}+</p>
    </div>
  );
}
