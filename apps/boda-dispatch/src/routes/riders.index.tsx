import { createFileRoute, Link } from "@tanstack/react-router";
import { riders } from "@/lib/dispatch-data";
import { initials, statusLabel } from "@/lib/dispatch-data";

export const Route = createFileRoute("/riders/")({
  head: () => ({ meta: [{ title: "All Riders — BodaDispatch" }] }),
  component: AllRiders,
});

function AllRiders() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">All Riders</h1>
        <p className="text-sm text-muted-foreground mt-1">{riders.length} registered riders across NairobiMove.</p>
      </header>
      <div className="rounded-xl bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/50">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Rider</th>
              <th className="text-left px-5 py-3 font-medium">Plate</th>
              <th className="text-left px-5 py-3 font-medium">Stage</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-right px-5 py-3 font-medium">Trips today</th>
              <th className="text-right px-5 py-3 font-medium">Earnings</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {riders.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold">
                      {initials(r.name)}
                    </div>
                    <div>{r.name}</div>
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{r.plate}</td>
                <td className="px-5 py-3">{r.stage}</td>
                <td className="px-5 py-3">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{r.tripsToday}</td>
                <td className="px-5 py-3 text-right tabular-nums">KES {r.earningsToday.toLocaleString()}</td>
                <td className="px-5 py-3 text-right">
                  <Link to="/riders/$id" params={{ id: r.id }} className="text-primary text-xs font-medium hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: typeof riders[number]["status"] }) {
  const map = {
    available: "bg-status-available/15 text-status-available",
    ontrip: "bg-status-ontrip/15 text-status-ontrip",
    offline: "bg-muted text-muted-foreground",
    sos: "bg-status-sos text-white animate-pulse-dot",
  } as const;
  return <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full ${map[status]}`}>{statusLabel(status)}</span>;
}
