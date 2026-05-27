import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { trips, STAGES } from "@/lib/dispatch-data";

export const Route = createFileRoute("/trips")({
  head: () => ({ meta: [{ title: "Trip Log — BodaDispatch" }] }),
  component: TripLog,
});

function TripLog() {
  const [stage, setStage] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(() => {
    return trips.filter((t) => {
      if (stage !== "all" && t.pickup !== stage) return false;
      if (status !== "all" && t.status !== status) return false;
      return true;
    });
  }, [stage, status]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Trip Log</h1>
        <p className="text-sm text-muted-foreground mt-1">All trips across riders, in real time.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl p-3">
        <input type="date" className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="h-10 px-3 rounded-md bg-background border border-border text-sm">
          <option value="all">All stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-md bg-background border border-border text-sm">
          <option value="all">All statuses</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <div className="text-xs text-muted-foreground ml-auto">{rows.length} trips</div>
      </div>

      <div className="rounded-xl bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/50">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Time</th>
              <th className="text-left px-5 py-3 font-medium">Rider</th>
              <th className="text-left px-5 py-3 font-medium">Pickup</th>
              <th className="text-left px-5 py-3 font-medium">Passenger</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-right px-5 py-3 font-medium">Airtime</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-5 py-3 tabular-nums">{t.time}</td>
                <td className="px-5 py-3">{t.riderName}</td>
                <td className="px-5 py-3">{t.pickup}</td>
                <td className="px-5 py-3 font-mono text-xs">{t.passengerPhone}</td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full ${
                    t.status === "Completed"
                      ? "bg-status-available/15 text-status-available"
                      : "bg-muted text-muted-foreground"
                  }`}>{t.status}</span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{t.airtime ? `KES ${t.airtime}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
